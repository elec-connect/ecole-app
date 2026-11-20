'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function InstallerEncart() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function installer() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return null;

  return (
    <div className="mt-8 border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg">
            📲
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Installer l&apos;application</p>
            <p className="text-xs text-gray-500">Accès rapide depuis votre bureau</p>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {showDetails && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {promptEvent ? (
            <div className="pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Installez ÉcoleApp pour un accès plus rapide et une expérience optimisée.
              </p>
              <button
                type="button"
                onClick={installer}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-sm"
              >
                Installer maintenant
              </button>
            </div>
          ) : (
            <div className="pt-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                Comment installer
              </p>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                  <span>Ouvrez <a href={appUrl} className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">{appUrl}</a> dans Chrome ou Edge</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                  <span>Cliquez sur l&apos;icône <strong>⊕ Installer</strong> dans la barre d&apos;adresse</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                  <span>L&apos;application apparaît sur votre bureau</span>
                </li>
              </ol>
              <div className="pt-2 border-t border-gray-100">
                <a
                  href="/EcoleApp.url"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  download
                >
                  ⬇ Télécharger le raccourci bureau
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErreur(data.erreur ?? 'Identifiants incorrects');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErreur('Erreur réseau. Veuillez réessayer.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-3xl mb-4 shadow-lg shadow-blue-500/20">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ÉcoleApp</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion scolaire</p>
        </div>

        {/* Carte du formulaire */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Bon retour 👋</h2>
            <p className="text-sm text-gray-500 mt-1">Connectez-vous à votre espace personnel</p>
          </div>

          {/* Erreur */}
          {erreur && (
            <div className="mb-5 bg-red-50 border-l-4 border-red-500 text-red-800 p-3 rounded-lg text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>{erreur}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ✉️
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@ecole.tn"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Lien inscription */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link
                href="/inscription"
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Faire une demande d&apos;inscription
              </Link>
            </p>
          </div>
        </div>

        {/* Encart PWA */}
        <InstallerEncart />

        {/* Footer */}
        {/* Footer */}
<div className="text-center mt-6 space-y-1">
  <p className="text-xs text-gray-400">
    © {new Date().getFullYear()} ÉcoleApp — Tous droits réservés
  </p>
  <p className="text-xs text-gray-400">
    Dev.: <span className="font-semibold text-gray-500">SAHNOUN BEN HAOUALA</span>
  </p>
</div>
      </div>
    </div>
  );
}