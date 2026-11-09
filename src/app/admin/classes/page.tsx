'use client';

import { useState, useEffect } from 'react';

type Classe = {
  id: string;
  nom: string;
  niveau: string;
  anneeScolaire: string;
  professeurPrincipal?: { id: string; nom: string; prenom: string } | null;
  _count: { inscriptions: number; cours: number };
};

type User = { id: string; nom: string; prenom: string };

const EMPTY = { nom: '', niveau: '', anneeScolaire: '2025-2026', professeurPrincipalId: '' };

export default function ClassesPage() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [profs, setProfs] = useState<User[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function charger() {
    const [r1, r2] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/utilisateurs?role=PROFESSEUR'),
    ]);
    setClasses(await r1.json());
    setProfs(await r2.json());
  }

  useEffect(() => { charger(); }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, professeurPrincipalId: form.professeurPrincipalId || null }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      setMessage(`❌ ${err.erreur ?? 'Erreur'}`);
      return;
    }

    setMessage('✅ Créée');
    setForm(EMPTY);
    charger();
  }

  async function supprimer(c: Classe) {
    if (!confirm(`Supprimer "${c.nom}" ?`)) return;
    const res = await fetch(`/api/classes/${c.id}`, { method: 'DELETE' });
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
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-gray-500 mt-1">{classes.length} classe(s)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold mb-4">➕ Nouvelle classe</h2>
        <form onSubmit={creer} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Nom (ex: 6ème A)" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Niveau (ex: 6ème)" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Année (2025-2026)" value={form.anneeScolaire} onChange={(e) => setForm({ ...form, anneeScolaire: e.target.value })} required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <select value={form.professeurPrincipalId} onChange={(e) => setForm({ ...form, professeurPrincipalId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Prof. principal —</option>
            {profs.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
          </select>
          <button type="submit" disabled={loading} className="md:col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Création...' : 'Créer'}
          </button>
        </form>
        {message && <p className="text-sm mt-3">{message}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full border-collapse bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Classe</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Niveau</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Année</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Prof. principal</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Élèves</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cours</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Aucune classe</td></tr>
            ) : (
              classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{c.nom}</td>
                  <td className="px-4 py-3 text-sm">{c.niveau}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.anneeScolaire}</td>
                  <td className="px-4 py-3 text-sm">{c.professeurPrincipal ? `${c.professeurPrincipal.prenom} ${c.professeurPrincipal.nom}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{c._count.inscriptions}</span></td>
                  <td className="px-4 py-3 text-sm text-center"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{c._count.cours}</span></td>
                  <td className="px-4 py-3 text-sm"><button onClick={() => supprimer(c)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Suppr.</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}