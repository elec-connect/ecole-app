'use client';

import { useState } from 'react';

type TypeNote = 'CONTROLE' | 'EXAMEN' | 'DEVOIR';

type Etudiant = { id: string; nom: string; prenom: string; email: string };

type Evaluation = {
  id: string;
  nom: string;
  type: TypeNote;
  coefficient: number;
  notes: { etudiantId: string; valeur: number }[];
};

interface Props {
  coursId: string;
  matiereId: string;
  etudiants: Etudiant[];
  evaluationsInitiales: Evaluation[];
}

const TYPES: { value: TypeNote; label: string }[] = [
  { value: 'CONTROLE', label: 'Contrôle' },
  { value: 'EXAMEN', label: 'Examen' },
  { value: 'DEVOIR', label: 'Devoir' },
];

export function NotesGrid({ coursId, matiereId, etudiants, evaluationsInitiales }: Props) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>(evaluationsInitiales);
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    evaluationsInitiales.forEach((ev) => {
      ev.notes.forEach((n) => {
        if (!initial[n.etudiantId]) initial[n.etudiantId] = {};
        initial[n.etudiantId][ev.id] = String(n.valeur);
      });
    });
    return initial;
  });
  const [nouvelleEval, setNouvelleEval] = useState({ nom: '', type: 'CONTROLE' as TypeNote, coefficient: '1' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');

  async function creerEvaluation(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coursId,
        nom: nouvelleEval.nom,
        type: nouvelleEval.type,
        coefficient: parseInt(nouvelleEval.coefficient) || 1,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setMessage('❌ ' + (err.erreur ?? 'Erreur'));
      return;
    }

    const created: Evaluation = await res.json();
    setEvaluations([...evaluations, { ...created, notes: [] }]);
    setNouvelleEval({ nom: '', type: 'CONTROLE', coefficient: '1' });
    setShowForm(false);
    setMessage('✅ Évaluation créée');
  }

  async function supprimerEvaluation(id: string) {
    if (!confirm('Supprimer cette évaluation et toutes ses notes ?')) return;
    const res = await fetch('/api/evaluations/' + id, { method: 'DELETE' });
    if (res.ok) {
      setEvaluations(evaluations.filter((e) => e.id !== id));
    }
  }

  async function sauvegarderNote(etudiantId: string, evaluationId: string, valeur: string) {
    const key = etudiantId + '-' + evaluationId;
    setSaving((s) => ({ ...s, [key]: true }));

    const v = parseFloat(valeur);
    if (isNaN(v) || v < 0 || v > 20) {
      setSaving((s) => ({ ...s, [key]: false }));
      return;
    }

    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etudiantId,
        matiereId,
        evaluationId,
        type: evaluations.find((e) => e.id === evaluationId)?.type ?? 'CONTROLE',
        valeur: v,
      }),
    });

    setSaving((s) => ({ ...s, [key]: false }));
  }

  function updateNote(etudiantId: string, evaluationId: string, valeur: string) {
    setNotes((prev) => ({
      ...prev,
      [etudiantId]: { ...(prev[etudiantId] ?? {}), [evaluationId]: valeur },
    }));
  }

  function moyenneEtudiant(etudiantId: string): string {
    let somme = 0;
    let totalCoef = 0;
    evaluations.forEach((ev) => {
      const val = parseFloat(notes[etudiantId]?.[ev.id] ?? '');
      if (!isNaN(val)) {
        somme += val * ev.coefficient;
        totalCoef += ev.coefficient;
      }
    });
    if (totalCoef === 0) return '—';
    return (somme / totalCoef).toFixed(2);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tableau des notes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          {showForm ? 'Annuler' : '➕ Nouvelle évaluation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creerEvaluation} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              value={nouvelleEval.nom}
              onChange={(e) => setNouvelleEval({ ...nouvelleEval, nom: e.target.value })}
              placeholder="Contrôle 1, TP 2..."
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={nouvelleEval.type}
              onChange={(e) => setNouvelleEval({ ...nouvelleEval, type: e.target.value as TypeNote })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient</label>
            <input
              type="number"
              min="1"
              max="10"
              value={nouvelleEval.coefficient}
              onChange={(e) => setNouvelleEval({ ...nouvelleEval, coefficient: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
            Créer
          </button>
        </form>
      )}

      {message && <p className="text-sm">{message}</p>}

      {evaluations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500 text-sm">Aucune évaluation. Cliquez sur "Nouvelle évaluation" pour commencer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50">Étudiant</th>
                {evaluations.map((ev) => (
                  <th key={ev.id} className="text-center px-2 py-3 text-xs font-semibold text-gray-600 min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{ev.nom}</span>
                      <span className="text-gray-400 font-normal">Coef. {ev.coefficient}</span>
                      <button
                        onClick={() => supprimerEvaluation(ev.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Moyenne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etudiants.map((et) => (
                <tr key={et.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium sticky left-0 bg-white">
                    {et.prenom} {et.nom}
                  </td>
                  {evaluations.map((ev) => {
                    const key = et.id + '-' + ev.id;
                    const value = notes[et.id]?.[ev.id] ?? '';
                    return (
                      <td key={ev.id} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={value}
                          onChange={(e) => updateNote(et.id, ev.id, e.target.value)}
                          onBlur={(e) => sauvegarderNote(et.id, ev.id, e.target.value)}
                          className={
                            'w-20 border rounded px-2 py-1 text-sm text-center ' +
                            (value !== '' && parseFloat(value) < 10 ? 'text-red-600 border-red-300' : 'border-gray-300')
                          }
                          placeholder="—"
                        />
                        {saving[key] && <span className="text-xs text-gray-400 ml-1">...</span>}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-sm text-center font-semibold text-blue-600">
                    {moyenneEtudiant(et.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        💡 Les notes sont sauvegardées automatiquement quand vous quittez une cellule.
      </p>
    </div>
  );
}