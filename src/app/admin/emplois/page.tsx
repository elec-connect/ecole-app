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

type Mode = 'prof' | 'eleve' | 'salle';

export default function EmploisPage() {
  const [mode, setMode] = useState<Mode>('prof');
  const [selectionId, setSelectionId] = useState('');
  const [cours, setCours] = useState<Cours[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (!selectionId) { setCours([]); return; }
    setLoading(true);
    fetch('/api/emplois?mode=' + mode + '&id=' + selectionId)
      .then((r) => r.json())
      .then((data) => { setCours(Array.isArray(data) ? data : []); setLoading(false); })
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
    cours.forEach((c) => { if (map[c.jourSemaine]) map[c.jourSemaine].push(c); });
    return map;
  }, [cours]);

  function changerMode(m: Mode) { setMode(m); setSelectionId(''); setCours([]); }

  const labelSelection = mode === 'prof' ? 'Professeur' : mode === 'eleve' ? 'Classe' : 'Salle';

  const options =
    mode === 'prof'
      ? profs.map((p) => ({ id: p.id, label: p.prenom + ' ' + p.nom }))
      : mode === 'eleve'
      ? classes.map((c) => ({ id: c.id, label: c.nom + ' (' + c.niveau + ')' }))
      : salles.map((s) => ({ id: s.id, label: s.nom + (s.type ? ' · ' + s.type : '') }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emplois du temps</h1>
        <p className="text-gray-500 mt-1">Consultez l&apos;emploi du temps par professeur, par classe ou par salle</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => changerMode('prof')} className={'px-4 py-2 text-sm font-medium border-b-2 transition ' + (mode === 'prof' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')}>🎓 Professeur</button>
        <button onClick={() => changerMode('eleve')} className={'px-4 py-2 text-sm font-medium border-b-2 transition ' + (mode === 'eleve' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')}>👨‍🎓 Élève (classe)</button>
        <button onClick={() => changerMode('salle')} className={'px-4 py-2 text-sm font-medium border-b-2 transition ' + (mode === 'salle' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')}>🏫 Salle</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner un(e) {labelSelection.toLowerCase()}</label>
        <select value={selectionId} onChange={(e) => setSelectionId(e.target.value)} className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">— Choisir —</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {mode === 'salle' && salles.length === 0 && <p className="text-xs text-orange-500 mt-2">⚠️ Aucune salle définie.</p>}
      </div>

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
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase border-r border-gray-100 w-28">Horaire</th>
                {JOURS.map((j) => <th key={j} className="text-center px-3 py-3 text-xs font-semibold text-gray-600 uppercase border-r border-gray-100 min-w-[150px]">{j}</th>)}
              </tr>
            </thead>
            <tbody>
              {heures.map((horaire) => (
                <tr key={horaire} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-100">{horaire}</td>
                  {JOURS_INDEX.map((jIdx) => {
                    const coursJour = grille[jIdx]?.filter((c) => c.heureDebut + '-' + c.heureFin === horaire) ?? [];
                    return (
                      <td key={jIdx} className="px-2 py-2 border-r border-gray-100 align-top">
                        {coursJour.length === 0 ? <span className="text-gray-200 text-xs">—</span> : coursJour.map((c) => (
                          <div key={c.id} className="bg-blue-50 border-l-2 border-blue-400 rounded p-2 mb-1 text-xs">
                            <p className="font-semibold text-blue-900">{c.matiere.nom}</p>
                            <p className="text-gray-600">{mode === 'prof' ? c.classe.nom : c.professeur.prenom + ' ' + c.professeur.nom}</p>
                            {c.salle && <p className="text-gray-400 text-xs mt-1">🏫 {c.salle.nom}</p>}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 Comment utiliser</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Professeur</strong> : voir les cours d&apos;un prof et ses salles</li>
          <li><strong>Élève</strong> : voir les cours d&apos;une classe</li>
          <li><strong>Salle</strong> : voir qui utilise la salle et quand</li>
        </ul>
      </div>
    </div>
  );
}