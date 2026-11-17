'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const NIVEAUX = [
  // Primaire
  { value: '1ere_primaire', label: '1ère année primaire' },
  { value: '2eme_primaire', label: '2ème année primaire' },
  { value: '3eme_primaire', label: '3ème année primaire' },
  { value: '4eme_primaire', label: '4ème année primaire' },
  { value: '5eme_primaire', label: '5ème année primaire' },
  { value: '6eme_primaire', label: '6ème année primaire' },
  // Secondaire
  { value: '7eme', label: '7ème année' },
  { value: '8eme', label: '8ème année' },
  { value: '9eme', label: '9ème année' },
  { value: '1ere', label: '1ère année sec.' },
  { value: '2eme', label: '2ème année sec.' },
  { value: '3eme', label: '3ème année sec.' },
  { value: '4eme', label: '4ème année sec.' },
];

export default function InscriptionPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError('');

    const formData = new FormData(event.currentTarget);
    const data = {
      nom: String(formData.get('nom') ?? '').trim(),
      prenom: String(formData.get('prenom') ?? '').trim(),
      emailEleve: String(formData.get('emailEleve') ?? '').trim(),
      emailParent: String(formData.get('emailParent') ?? '').trim(),
      nomParent: String(formData.get('nomParent') ?? '').trim(),
      prenomParent: String(formData.get('prenomParent') ?? '').trim(),
      telephone: String(formData.get('telephone') ?? '').trim(),
      niveauDemande: String(formData.get('niveauDemande') ?? '').trim(),
    };

    const nextErrors: Record<string, string> = {};
    if (!data.nom) nextErrors.nom = 'Nom de l\'élève requis';
    if (!data.prenom) nextErrors.prenom = 'Prénom de l\'élève requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailEleve)) {
      nextErrors.emailEleve = 'Email de l\'élève invalide';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailParent)) {
      nextErrors.emailParent = 'Email du parent invalide';
    }
    if (!data.nomParent) nextErrors.nomParent = 'Nom du parent requis';
    if (!data.prenomParent) nextErrors.prenomParent = 'Prénom du parent requis';
    if (!data.niveauDemande) nextErrors.niveauDemande = 'Niveau requis';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/demandes-inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.erreur ?? 'Erreur lors de l\'envoi de la demande');
        return;
      }

      setSuccess(true);
    } catch {
      setServerError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-bold text-gray-900">Demande envoyée !</h1>
          <p className="text-gray-600">
            Votre demande d&apos;inscription a bien été reçue. Un email de confirmation
            vous sera envoyé. Vous serez contacté dès que le compte sera validé.
          </p>
          <Link href="/login" className="inline-block text-blue-600 hover:underline text-sm">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-lg space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">📝 Inscription</h1>
          <p className="text-sm text-gray-500 mt-1">Pré-inscrivez votre enfant</p>
        </div>

        {serverError && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {/* --- INFORMATIONS ÉLÈVE --- */}
          <div className="border-b pb-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">👦 Informations de l&apos;élève</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  name="nom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ben Ali"
                />
                {errors.nom && <p className="text-xs text-red-500 mt-1" role="alert">{errors.nom}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  name="prenom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ahmed"
                />
                {errors.prenom && <p className="text-xs text-red-500 mt-1" role="alert">{errors.prenom}</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de l&apos;élève</label>
              <input
                name="emailEleve"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="eleve@email.com"
              />
              {errors.emailEleve && <p className="text-xs text-red-500 mt-1" role="alert">{errors.emailEleve}</p>}
            </div>
          </div>

          {/* --- INFORMATIONS PARENT --- */}
          <div className="border-b pb-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">👨‍👩‍👦 Informations du parent</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du parent</label>
                <input
                  name="nomParent"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ben Ali"
                />
                {errors.nomParent && <p className="text-xs text-red-500 mt-1" role="alert">{errors.nomParent}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom du parent</label>
                <input
                  name="prenomParent"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mohamed"
                />
                {errors.prenomParent && <p className="text-xs text-red-500 mt-1" role="alert">{errors.prenomParent}</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email du parent</label>
              <input
                name="emailParent"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="parent@email.com"
              />
              {errors.emailParent && <p className="text-xs text-red-500 mt-1" role="alert">{errors.emailParent}</p>}
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
              <input
                name="telephone"
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+216 XX XXX XXX"
              />
            </div>
          </div>

          {/* --- NIVEAU --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau demandé</label>
            <select
              name="niveauDemande"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              defaultValue=""
            >
              <option value="" disabled>Sélectionner un niveau</option>
              {NIVEAUX.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
            {errors.niveauDemande && <p className="text-xs text-red-500 mt-1" role="alert">{errors.niveauDemande}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}