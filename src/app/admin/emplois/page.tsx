'use client';

import { useState, useEffect, useMemo } from 'react';

type Classe = { id: string; nom: string; niveau: string };
type Matiere = { id: string; nom: string; coefficient: number };
type Prof = { id: string; nom: string; prenom: string; email: string };
type Salle = { id: string; nom: string; type: string | null };

type Cours = {
  id: string;
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  classe: Classe;
  matiere: Matiere;
  professeur: Prof;
  salle: Salle | null;
};

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const JOURS_INDEX = [1, 2, 3, 4, 5, 6];

// ⭐ Couleurs par matière pour l'affichage web
const COULEURS_MATIERES: Record<string, string> = {
  'Mathématiques': 'bg-blue-100 border-blue-500 text-blue-900',
  'Français': 'bg-red-100 border-red-500 text-red-900',
  'Arabe': 'bg-yellow-100 border-yellow-500 text-yellow-900',
  'Anglais': 'bg-green-100 border-green-500 text-green-900',
  'Physique': 'bg-purple-100 border-purple-500 text-purple-900',
  'Chimie': 'bg-violet-100 border-violet-500 text-violet-900',
  'Science et vie': 'bg-teal-100 border-teal-500 text-teal-900',
  'Histoire': 'bg-orange-100 border-orange-500 text-orange-900',
  'Géographie': 'bg-pink-100 border-pink-500 text-pink-900',
  'Éducation islamique': 'bg-sky-100 border-sky-500 text-sky-900',
  'Sport': 'bg-emerald-100 border-emerald-500 text-emerald-900',
  'Informatique': 'bg-indigo-100 border-indigo-500 text-indigo-900',
  'Technique': 'bg-slate-100 border-slate-500 text-slate-900',
  'Philosophie': 'bg-amber-100 border-amber-500 text-amber-900',
};

function getCouleurMatiere(nom: string): string {
  return COULEURS_MATIERES[nom] ?? 'bg-gray-100 border-gray-500 text-gray-900';
}

type Mode = 'prof' | 'eleve' | 'salle';

export default function EmploisPage() {
  const [mode, setMode] = useState<Mode>('prof');
  const [selectionId, setSelectionId] = useState('');
  const [cours, setCours] = useState<Cours[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(false);

  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [messageAction, setMessageAction] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/utilisateurs?role=PROFESSEUR').then((r) => r.json()),
      fetch('/api/classes').then((r) => r.json()),
      fetch('/api/salles').then((r) => r.json()),
    ]).then(([p, c, s]) => {
      setProfs(Array.isArray(p) ? p : []);
      setClasses(Array.isArray(c) ? c : []);
      setSalles(Array.isArray(s) ? s : []);
    });
  }, []);

  useEffect(() => {
    if (!selectionId) {
      setCours([]);
      return;
    }
    setLoading(true);
    fetch('/api/emplois?mode=' + mode + '&id=' + selectionId)
      .then((r) => r.json())
      .then((data) => {
        setCours(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mode, selectionId]);

  const heures = useMemo(() => {
    const set = new Set<string>();
    cours.forEach((c) => set.add(c.heureDebut + '-' + c.heureFin));
    return Array.from(set).sort();
  }, [cours]);

  const grille = useMemo(() => {
    const map: Record<number, Cours[]> = {};
    JOURS_INDEX.forEach((j) => (map[j] = []));
    cours.forEach((c) => {
      if (map[c.jourSemaine]) map[c.jourSemaine].push(c);
    });
    return map;
  }, [cours]);

  function changerMode(m: Mode) {
    setMode(m);
    setSelectionId('');
    setCours([]);
    setMessageAction('');
  }

  const labelSelection = mode === 'prof' ? 'Professeur' : mode === 'eleve' ? 'Classe' : 'Salle';

  const options =
    mode === 'prof'
      ? profs.map((p) => ({ id: p.id, label: p.prenom + ' ' + p.nom }))
      : mode === 'eleve'
      ? classes.map((c) => ({ id: c.id, label: c.nom + ' (' + c.niveau + ')' }))
      : salles.map((s) => ({ id: s.id, label: s.nom + (s.type ? ' · ' + s.type : '') }));

  async function telechargerPDF() {
    if (!selectionId || !mode) return;
    setLoadingPDF(true);
    setMessageAction('');

    try {
      const res = await fetch('/api/emplois/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, id: selectionId, anneeScolaire: '' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessageAction('❌ ' + (data.erreur ?? 'Erreur'));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emploi-${mode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setMessageAction('✅ PDF téléchargé');
    } catch (e: any) {
      setMessageAction('❌ ' + e.message);
    } finally {
      setLoadingPDF(false);
    }
  }

  async function envoyerEmail() {
    if (!selectionId || !mode) return;
    if (!confirm("Envoyer l'emploi du temps à tous les destinataires ?")) return;
    setLoadingEmail(true);
    setMessageAction('');

    try {
      const res = await fetch('/api/emplois/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, id: selectionId, anneeScolaire: '' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageAction('❌ ' + (data.erreur ?? 'Erreur'));
        return;
      }

      setMessageAction(
        data.echecs === 0
          ? `✅ ${data.succes} email(s) envoyé(s)`
          : `⚠️ ${data.succes} envoyé(s), ${data.echecs} échec(s)`
      );
    } catch (e: any) {
      setMessageAction('❌ ' + e.message);
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emplois du temps</h1>
        <p className="text-gray-500 mt-1">
          Consultez l&apos;emploi du temps par professeur, par classe ou par salle
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => changerMode('prof')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 transition ' +
            (mode === 'prof' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')
          }
        >
          🎓 Professeur
        </button>
        <button
          onClick={() => changerMode('eleve')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 transition ' +
            (mode === 'eleve' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')
          }
        >
          👨‍🎓 Élève (classe)
        </button>
        <button
          onClick={() => changerMode('salle')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 transition ' +
            (mode === 'salle' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')
          }
        >
          🏫 Salle
        </button>
      </div>

      {/* Sélection + actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un(e) {labelSelection.toLowerCase()}
          </label>
          <select
            value={selectionId}
            onChange={(e) => setSelectionId(e.target.value)}
            className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Choisir —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {mode === 'salle' && salles.length === 0 && (
            <p className="text-xs text-orange-500 mt-2">⚠️ Aucune salle définie.</p>
          )}
        </div>

        {/* Boutons PDF / Email */}
        {selectionId && (
          <div className="flex flex-wrap gap-2 items-center border-t border-gray-100 pt-4">
            <button
              onClick={telechargerPDF}
              disabled={loadingPDF}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            >
              {loadingPDF ? 'PDF...' : '📄 Télécharger PDF'}
            </button>
            <button
              onClick={envoyerEmail}
              disabled={loadingEmail}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {loadingEmail ? 'Envoi...' : '📧 Envoyer par email'}
            </button>
            {messageAction && (
              <span className="text-sm ml-2">{messageAction}</span>
            )}
          </div>
        )}
      </div>

      {/* Grille */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement…</div>
      ) : selectionId && cours.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500 text-sm">Aucun cours programmé.</p>
        </div>
      ) : selectionId && cours.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase border-r border-blue-500 w-28">
                  Horaire
                </th>
                {JOURS.map((j) => (
                  <th key={j} className="text-center px-3 py-3 text-xs font-bold uppercase border-r border-blue-500 min-w-[150px]">
                    {j}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heures.map((horaire) => (
                <tr key={horaire} className="border-t border-gray-200">
                  <td className="px-4 py-3 text-xs font-bold text-gray-700 bg-gray-50 border-r border-gray-200 text-center">
                    {horaire}
                  </td>
                  {JOURS_INDEX.map((jIdx) => {
                    const coursJour =
                      grille[jIdx]?.filter((c) => c.heureDebut + '-' + c.heureFin === horaire) ?? [];
                    return (
                      <td key={jIdx} className="px-2 py-2 border-r border-gray-100 align-top">
                        {coursJour.length === 0 ? (
                          <span className="text-gray-200 text-xs block text-center py-2">—</span>
                        ) : (
                          coursJour.map((c) => (
                            <div
                              key={c.id}
                              className={
                                'rounded-lg p-2 mb-1 text-xs border-l-4 shadow-sm ' +
                                getCouleurMatiere(c.matiere.nom)
                              }
                            >
                              <p className="font-bold text-sm leading-tight">{c.matiere.nom}</p>
                              <p className="font-medium mt-1">
                                {mode === 'prof'
                                  ? c.classe.nom
                                  : `${c.professeur.prenom} ${c.professeur.nom}`}
                              </p>
                              {c.salle && (
                                <p className="text-xs mt-1 opacity-75">📍 {c.salle.nom}</p>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Légende */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-sm text-blue-800">
        <p className="font-medium mb-2">💡 Comment utiliser</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Professeur</strong> : voir les cours d&apos;un prof et ses salles</li>
          <li><strong>Élève</strong> : voir les cours d&apos;une classe</li>
          <li><strong>Salle</strong> : voir qui utilise la salle et quand</li>
          <li><strong>📄 PDF</strong> : télécharger l&apos;emploi en PDF professionnel</li>
          <li><strong>📧 Email</strong> : envoyer l&apos;emploi par email (prof ou tous les élèves de la classe)</li>
        </ul>
      </div>
    </div>
  );
}