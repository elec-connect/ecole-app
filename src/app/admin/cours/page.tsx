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
  _count: { presences: number; devoirs: number; evaluations: number };
};

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const JOURS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const EMPTY = {
  id: '',
  classeId: '',
  matiereId: '',
  professeurId: '',
  jourSemaine: '1',
  heureDebut: '08:00',
  heureFin: '09:00',
  salleId: '',
};

export default function CoursAdminPage() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [edition, setEdition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filtreClasse, setFiltreClasse] = useState<string>('TOUTES');

  async function charger() {
    const [rc, rcl, rm, rp, rs] = await Promise.all([
      fetch('/api/cours'),
      fetch('/api/classes'),
      fetch('/api/matieres'),
      fetch('/api/utilisateurs?role=PROFESSEUR'),
      fetch('/api/salles'),
    ]);
    setCours(await rc.json());
    setClasses(await rcl.json());
    setMatieres(await rm.json());
    setProfs(await rp.json());
    setSalles(await rs.json());
  }

  useEffect(() => {
    charger();
  }, []);

  const coursGroupes = useMemo(() => {
    const filtered = filtreClasse === 'TOUTES'
      ? cours
      : cours.filter((c) => c.classe.id === filtreClasse);

    const map = new Map<string, { classe: Classe; cours: Cours[] }>();
    for (const c of filtered) {
      if (!map.has(c.classe.id)) {
        map.set(c.classe.id, { classe: c.classe, cours: [] });
      }
      map.get(c.classe.id)!.cours.push(c);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.classe.niveau + a.classe.nom).localeCompare(b.classe.niveau + b.classe.nom)
    );
  }, [cours, filtreClasse]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const url = edition ? '/api/cours/' + form.id : '/api/cours';
    const method = edition ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classeId: form.classeId,
        matiereId: form.matiereId,
        professeurId: form.professeurId,
        jourSemaine: parseInt(form.jourSemaine),
        heureDebut: form.heureDebut,
        heureFin: form.heureFin,
        salleId: form.salleId || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      setMessage('❌ ' + (err.erreur ?? 'Erreur'));
      return;
    }

    setMessage(edition ? '✅ Cours modifié' : '✅ Cours créé');
    setForm(EMPTY);
    setEdition(false);
    charger();
  }

  function editer(c: Cours) {
    setForm({
      id: c.id,
      classeId: c.classe.id,
      matiereId: c.matiere.id,
      professeurId: c.professeur.id,
      jourSemaine: String(c.jourSemaine),
      heureDebut: c.heureDebut,
      heureFin: c.heureFin,
      salleId: c.salle?.id ?? '',
    });
    setEdition(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function annuler() {
    setForm(EMPTY);
    setEdition(false);
    setMessage('');
  }

  async function supprimer(c: Cours) {
    if (!confirm('Supprimer ce cours ? Toutes les présences/notes/devoirs associés seront perdus.')) return;
    const res = await fetch('/api/cours/' + c.id, { method: 'DELETE' });
    if (!res.ok) {
      alert('Erreur');
      return;
    }
    charger();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des cours</h1>
        <p className="text-gray-500 mt-1">
          {cours.length} cours · Chaque cours relie une matière, une classe, un professeur et une salle
        </p>
      </div>

      {/* Formulaire */}
      <div className={'bg-white rounded-xl shadow-sm border-2 p-6 ' + (edition ? 'border-blue-400' : 'border-gray-100')}>
        <h2 className="font-semibold mb-4">
          {edition ? '✏️ Modifier le cours' : '➕ Nouveau cours'}
        </h2>
        <form onSubmit={enregistrer} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select
              value={form.classeId}
              onChange={(e) => setForm({ ...form, classeId: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
            <select
              value={form.matiereId}
              onChange={(e) => setForm({ ...form, matiereId: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>{m.nom} (coef {m.coefficient})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professeur</label>
            <select
              value={form.professeurId}
              onChange={(e) => setForm({ ...form, professeurId: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {profs.map((p) => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salle</label>
            <select
              value={form.salleId}
              onChange={(e) => setForm({ ...form, salleId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Aucune —</option>
              {salles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}{s.type ? ' (' + s.type + ')' : ''}
                </option>
              ))}
            </select>
            {salles.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">
                ⚠️ Créez des salles dans /admin/salles
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
            <select
              value={form.jourSemaine}
              onChange={(e) => setForm({ ...form, jourSemaine: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {JOURS.map((j, i) => (
                <option key={i} value={i}>{j}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure début</label>
            <input
              type="time"
              value={form.heureDebut}
              onChange={(e) => setForm({ ...form, heureDebut: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin</label>
            <input
              type="time"
              value={form.heureFin}
              onChange={(e) => setForm({ ...form, heureFin: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : edition ? 'Enregistrer les modifications' : 'Créer le cours'}
            </button>
            {edition && (
              <button
                type="button"
                onClick={annuler}
                className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            )}
            {message && <span className="text-sm">{message}</span>}
          </div>
        </form>
      </div>

      {/* Filtre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par classe</label>
        <select
          value={filtreClasse}
          onChange={(e) => setFiltreClasse(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="TOUTES">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
          ))}
        </select>
      </div>

      {/* Liste groupée */}
      {coursGroupes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Aucun cours enregistré.</p>
        </div>
      ) : (
        coursGroupes.map((groupe) => (
          <div key={groupe.classe.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900">
                🏫 {groupe.classe.nom}{' '}
                <span className="text-sm text-gray-500 font-normal">({groupe.classe.niveau})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">{groupe.cours.length} cours</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Jour</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Horaire</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Matière</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Professeur</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Salle</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Éval.</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupe.cours.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{JOURS_COURT[c.jourSemaine]}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {c.heureDebut} - {c.heureFin}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        {c.matiere.nom}
                        <span className="text-xs text-gray-400 ml-1">(coef {c.matiere.coefficient})</span>
                      </td>
                      <td className="px-4 py-2 text-sm">{c.professeur.prenom} {c.professeur.nom}</td>
                      <td className="px-4 py-2 text-sm">
                        {c.salle ? (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
                            🏫 {c.salle.nom}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-500">
                        {c._count.evaluations} éval / {c._count.presences} prés.
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editer(c)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            ✏️ Éditer
                          </button>
                          <button
                            onClick={() => supprimer(c)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}