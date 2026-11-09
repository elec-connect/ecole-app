'use client';

import { useState, useEffect } from 'react';

type Matiere = { id: string; nom: string; coefficient: number; _count: { cours: number; notes: number } };

const EMPTY = { id: '', nom: '', coefficient: '1' };

export default function MatieresPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [edition, setEdition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function charger() {
    const res = await fetch('/api/matieres');
    setMatieres(await res.json());
  }

  useEffect(() => { charger(); }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const url = edition ? '/api/matieres/' + form.id : '/api/matieres';
    const method = edition ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: form.nom, coefficient: parseInt(form.coefficient) || 1 }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      setMessage('❌ ' + (err.erreur ?? 'Erreur'));
      return;
    }

    setMessage(edition ? '✅ Modifiée' : '✅ Créée');
    setForm(EMPTY);
    setEdition(false);
    charger();
  }

  function editer(m: Matiere) {
    setForm({ id: m.id, nom: m.nom, coefficient: String(m.coefficient) });
    setEdition(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function supprimer(m: Matiere) {
    if (!confirm('Supprimer "' + m.nom + '" ?')) return;
    const res = await fetch('/api/matieres/' + m.id, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.erreur ?? 'Erreur');
      return;
    }
    charger();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matières</h1>
        <p className="text-gray-500 mt-1">{matieres.length} matière(s) · Le coefficient est défini par l'admin</p>
      </div>

      <div className={'bg-white rounded-xl shadow-sm border-2 p-6 ' + (edition ? 'border-blue-400' : 'border-gray-100')}>
        <h2 className="font-semibold mb-4">
          {edition ? '✏️ Modifier la matière' : '➕ Nouvelle matière'}
        </h2>
        <form onSubmit={enregistrer} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <input
            placeholder="Nom de la matière"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="1"
            max="10"
            placeholder="Coefficient"
            value={form.coefficient}
            onChange={(e) => setForm({ ...form, coefficient: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '...' : edition ? 'Enregistrer' : 'Créer'}
            </button>
            {edition && (
              <button type="button" onClick={() => { setForm(EMPTY); setEdition(false); }} className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300">
                Annuler
              </button>
            )}
          </div>
        </form>
        {message && <p className="text-sm mt-3">{message}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nom</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Coefficient</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cours</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Notes</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matieres.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Aucune matière</td></tr>
            ) : (
              matieres.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{m.nom}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Coef. {m.coefficient}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{m._count.cours}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{m._count.notes}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => editer(m)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Éditer</button>
                      <button onClick={() => supprimer(m)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Suppr.</button>
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