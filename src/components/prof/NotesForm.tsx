'use client';

import { useState } from 'react';

type TypeNote = 'CONTROLE' | 'EXAMEN' | 'DEVOIR';

type Etudiant = { id: string; nom: string; prenom: string; email: string };

type Note = {
  id: string;
  etudiantId: string;
  type: TypeNote;
  valeur: number;
  coefficient: number;
  date: string;
  commentaire?: string | null;
};

const TYPES: { value: TypeNote; label: string; color: string }[] = [
  { value: 'CONTROLE', label: 'Contrôle', color: 'bg-blue-100 text-blue-700' },
  { value: 'EXAMEN', label: 'Examen', color: 'bg-orange-100 text-orange-700' },
  { value: 'DEVOIR', label: 'Devoir', color: 'bg-yellow-100 text-yellow-700' },
];

interface Props {
  coursId: string;
  matiereId: string;
  etudiants: Etudiant[];
  notesInitiales: Note[];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function NotesForm({ coursId, matiereId, etudiants, notesInitiales }: Props) {
  const [notes, setNotes] = useState<Note[]>(notesInitiales);
  const [etudiantId, setEtudiantId] = useState('');
  const [type, setType] = useState<TypeNote>('CONTROLE');
  const [valeur, setValeur] = useState('');
  const [coefficient, setCoefficient] = useState('1');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function ajouterNote(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const v = parseFloat(valeur);
    if (isNaN(v) || v < 0 || v > 20) {
      setMessage('❌ Note invalide (0-20)');
      return;
    }
    if (!etudiantId) {
      setMessage('❌ Sélectionnez un étudiant');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etudiantId,
        matiereId,
        type,
        valeur: v,
        coefficient: parseInt(coefficient) || 1,
        commentaire: commentaire || null,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      setMessage('❌ Erreur');
      return;
    }

    const nouvelle: Note = await res.json();
    setNotes([nouvelle, ...notes]);
    setMessage('✅ Note ajoutée');
    setValeur('');
    setCommentaire('');
  }

  async function supprimerNote(id: string) {
    if (!confirm('Supprimer cette note ?')) return;
    const res = await fetch('/api/notes/' + id, { method: 'DELETE' });
    if (res.ok) setNotes(notes.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={ajouterNote} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-semibold text-gray-900">➕ Ajouter une note</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Étudiant</label>
            <select
              value={etudiantId}
              onChange={(e) => setEtudiantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {etudiants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeNote)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (0-20)</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="20"
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient</label>
            <input
              type="number"
              min="1"
              max="10"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
            <input
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Bon travail, attention aux fautes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ajout...' : 'Ajouter la note'}
          </button>
          {message && <span className="text-sm">{message}</span>}
        </div>
      </form>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">📋 Notes enregistrées ({notes.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Étudiant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Note</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Coef.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Aucune note</td>
                </tr>
              ) : (
                notes.map((n) => {
                  const etu = etudiants.find((e) => e.id === n.etudiantId);
                  const typeInfo = TYPES.find((t) => t.value === n.type);
                  return (
                    <tr key={n.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {etu ? etu.prenom + ' ' + etu.nom : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={'px-2 py-0.5 rounded-full text-xs ' + (typeInfo?.color ?? 'bg-gray-100')}>
                          {typeInfo?.label ?? n.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={'font-semibold ' + (n.valeur >= 10 ? 'text-green-600' : 'text-red-600')}>
                          {n.valeur.toFixed(2)}/20
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{n.coefficient}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(n.date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => supprimerNote(n.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}