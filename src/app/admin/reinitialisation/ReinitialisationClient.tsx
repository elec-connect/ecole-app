'use client';

import { useState } from 'react';
import { reinitialiserAnneeScolaire } from './actions';

export function ReinitialisationClient({ anneeActuelle }: { anneeActuelle: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; texte: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');

  async function handleClick() {
    // Première confirmation
    if (
      !confirm(
        `⚠️ ATTENTION : Cette action va archiver puis SUPPRIMER toutes les classes, emplois du temps et inscriptions de l'année ${anneeActuelle}.\n\nVoulez-vous vraiment continuer ?`
      )
    ) {
      return;
    }

    // Deuxième confirmation : taper "REINITIALISER"
    if (confirmation.trim().toUpperCase() !== 'REINITIALISER') {
      setMessage({
        type: 'error',
        texte: 'Veuillez taper "REINITIALISER" dans le champ pour confirmer.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await reinitialiserAnneeScolaire();

    setLoading(false);
    if (result.succes) {
      setMessage({ type: 'success', texte: result.succes });
      setConfirmation('');
    } else {
      setMessage({ type: 'error', texte: result.erreur ?? 'Erreur inconnue' });
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-red-200 space-y-4">
      <h2 className="font-semibold text-lg text-red-800">🔴 Zone de danger</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tapez <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">REINITIALISER</code> pour confirmer
        </label>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="REINITIALISER"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={loading}
        />
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading || confirmation.trim().toUpperCase() !== 'REINITIALISER'}
        className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? '⏳ Traitement en cours...' : '🗑️ Réinitialiser l\'année scolaire'}
      </button>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? '✅ ' : '❌ '}
          {message.texte}
        </div>
      )}
    </div>
  );
}