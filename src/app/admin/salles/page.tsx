'use client';

import { useState, useEffect } from 'react';

type Matiere = { id: string; nom: string; coefficient: number };

type Salle = {
  id: string;
  nom: string;
  capacite: number | null;
  type: string | null;
  batiment: string | null;
  matieres: Matiere[];
  _count: { cours: number };
};

const TYPES = ['Standard', 'Labo', 'Sport', 'Informatique', 'Amphithéâtre', 'Atelier'];

const EMPTY = {
  id: '',
  nom: '',
  capacite: '',
  type: '',
  batiment: '',
  matiereIds: [] as string[],
};

export default function SallesPage() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [edition, setEdition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function charger() {
    const [rs, rm] = await Promise.all([fetch('/api/salles'), fetch('/api/matieres')]);
    setSalles(await rs.json());
    setMatieres(await rm.json());
  }

  useEffect(() => { charger(); }, []);

  function toggleMatiere(id: string) {
    setForm((f) => ({
      ...f,
      matiereIds: f.matiereIds.includes(id)
        ? f.matiereIds.filter((m) => m !== id)
        : [...f.matiereIds, id],
    }));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const url = edition ? '/api/salles/' + form.id : '/api/salles';
    const method = edition ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: form.nom,
        capacite: form.capacite || null,
        type: form.type || null,
        batiment: form.batiment || null,
        matiereIds: form.matiereIds,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      setMessage('❌ ' + (err.erreur ?? 'Erreur'));
      return;
    }

    setMessage(edition ? '✅ Salle modifiée' : '✅ Salle créée');
    setForm(EMPTY);
    setEdition(false);
    charger();
  }

  function editer(s: Salle) {
    setForm({
      id: s.id,
      nom: s.nom,
      capacite: s.capacite ? String(s.capacite) : '',
      type: s.type ?? '',
      batiment: s.batiment ?? '',
      matiereIds: s.matieres.map((m) => m.id),
    });
    setEdition(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function supprimer(s: Salle) {
    if (!confirm('Supprimer "' + s.nom + '" ?')) return;
    const res = await fetch('/api/salles/' + s.id, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.erreur ?? 'Erreur');
      return;
    }
    charger();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salles</h1>
        <p className="text-gray-500 mt-1">
          {salles.length} salle(s) · Chaque salle peut accueillir une ou plusieurs matières
        </p>
      </div>

      <div className={'bg-white rounded-xl shadow-sm border-2 p-6 space-y-4 ' + (edition ? 'border-blue-400' : 'border-gray-100')}>
        <h2 className="font-semibold">
          {edition ? '✏️ Modifier la salle' : '➕ Nouvelle salle'}
        </h2>

        <form onSubmit={enregistrer} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Salle 1, Labo Chimie, Gymnase…"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Aucun —</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacité</label>
              <input
                type="number"
                min="1"
                value={form.capacite}
                onChange={(e) => setForm({ ...form, capacite: e.target.value })}
                placeholder="30"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bâtiment</label>
              <input
                value={form.batiment}
                onChange={(e) => setForm({ ...form, batiment: e.target.value })}
                placeholder="Bâtiment A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Matières */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              📚 Matières compatibles ({form.matiereIds.length})
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Laissez vide si la salle est polyvalente (accueille toutes les matières)
            </p>
            {matieres.length === 0 ? (
              <p className="text-xs text-blue-700">Aucune matière disponible.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {matieres.map((m) => {
                  const selected = form.matiereIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={
                        'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ' +
                        (selected ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-100')
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMatiere(m.id)}
                        className="rounded"
                      />
                      <span className="font-medium">{m.nom}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '...' : edition ? 'Enregistrer' : 'Créer'}
            </button>
            {edition && (
              <button type="button" onClick={() => { setForm(EMPTY); setEdition(false); }} className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300">
                Annuler
              </button>
            )}
            {message && <span className="text-sm">{message}</span>}
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nom</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Matières</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cours</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {salles.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Aucune salle</td></tr>
            ) : (
              salles.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {s.nom}
                    {s.batiment && <span className="text-xs text-gray-400 block">{s.batiment}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {s.type ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{s.type}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {s.matieres.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Polyvalente</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {s.matieres.map((m) => (
                          <span key={m.id} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                            {m.nom}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{s._count.cours}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => editer(s)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Éditer</button>
                      <button onClick={() => supprimer(s)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}