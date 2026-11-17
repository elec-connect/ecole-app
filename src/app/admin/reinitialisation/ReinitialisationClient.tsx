'use client';

import { useState, useEffect } from 'react';
import { reinitialiserAnneeScolaire } from './actions';

interface Props {
  anneesDisponibles: string[];
  anneeCourante: string;
}

export function ReinitialisationClient({ anneesDisponibles, anneeCourante }: Props) {
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(anneeCourante);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; texte: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  
  // ⭐ États pour les statistiques dynamiques
  const [stats, setStats] = useState({ nbClasses: 0, nbInscriptions: 0, nbFrais: 0, nbTarifs: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // ⭐ Charger les stats à chaque changement d'année
  useEffect(() => {
    async function chargerStats() {
      setLoadingStats(true);
      try {
        const res = await fetch(`/api/stats-reinitialisation?annee=${encodeURIComponent(anneeSelectionnee)}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Erreur chargement stats:', e);
      } finally {
        setLoadingStats(false);
      }
    }
    
    if (anneeSelectionnee) {
      chargerStats();
    }
  }, [anneeSelectionnee]);

  async function handleClick() {
    if (!anneeSelectionnee) {
      setMessage({ type: 'error', texte: 'Veuillez sélectionner une année.' });
      return;
    }

    if (
      !confirm(
        `⚠️ ATTENTION : Cette action va archiver puis SUPPRIMER toutes les données de l'année ${anneeSelectionnee}.\n\nVoulez-vous vraiment continuer ?`
      )
    ) {
      return;
    }

    if (confirmation.trim().toUpperCase() !== 'REINITIALISER') {
      setMessage({ type: 'error', texte: 'Veuillez taper "REINITIALISER" dans le champ pour confirmer.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await reinitialiserAnneeScolaire(anneeSelectionnee);

    setLoading(false);
    if (result.succes) {
      setMessage({ type: 'success', texte: result.succes });
      setConfirmation('');
      // Recharger les stats pour voir les 0
      setStats({ nbClasses: 0, nbInscriptions: 0, nbFrais: 0, nbTarifs: 0 });
    } else {
      setMessage({ type: 'error', texte: result.erreur ?? 'Erreur inconnue' });
    }
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sélectionner l&apos;année scolaire à réinitialiser
        </label>
        <select
          value={anneeSelectionnee}
          onChange={(e) => setAnneeSelectionnee(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium bg-white"
          disabled={loading}
        >
          {anneesDisponibles.map((annee) => (
            <option key={annee} value={annee}>
              {annee} {annee === anneeCourante ? '(en cours)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ⭐ Affichage dynamique des stats */}
      <div className={`bg-gray-50 p-3 rounded-lg text-xs text-gray-600 transition-opacity ${loadingStats ? 'opacity-50' : 'opacity-100'}`}>
        <p className="font-semibold mb-1">Données impactées pour {anneeSelectionnee} :</p>
        {loadingStats ? (
          <p>Chargement...</p>
        ) : (
          <ul className="list-disc list-inside">
            <li>{stats.nbClasses} classe(s)</li>
            <li>{stats.nbInscriptions} inscription(s)</li>
            <li>{stats.nbFrais} dossier(s) de frais</li>
            <li>{stats.nbTarifs} tarif(s) professeur</li>
          </ul>
        )}
      </div>

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
        {loading ? '⏳ Traitement en cours...' : `🗑️ Réinitialiser l'année ${anneeSelectionnee}`}
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