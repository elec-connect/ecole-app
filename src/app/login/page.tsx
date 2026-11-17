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
  
  // ⭐ Utiliser l'URL courante du navigateur ou la variable d'environnement
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
    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
      <p className="font-semibold mb-2 flex items-center gap-2">
        📲 Installer ÉcoleApp sur votre bureau
      </p>

      {promptEvent ? (
        <>
          <p className="text-blue-800 mb-2">
            Installez ÉcoleApp comme une application pour un accès plus rapide.
          </p>
          <button
            type="button"
            onClick={installer}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            ⊕ Installer maintenant
          </button>
        </>
      ) : (
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>
            Ouvrez{' '}
            <a
              href={appUrl}
              className="underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {appUrl}
            </a>{' '}
            dans Chrome ou Edge
          </li>
          <li>
            Cliquez sur l&apos;icône <strong>⊕ Installer</strong> à droite de la barre d&apos;adresse
          </li>
          <li>ÉcoleApp s&apos;installe comme une application, avec une icône sur votre bureau</li>
        </ol>
      )}

      <p className="mt-2 text-xs text-blue-700">
        Ou téléchargez le{' '}
        <a href="/EcoleApp.url" className="underline font-medium" download>
          raccourci bureau
        </a>{' '}
        et double-cliquez dessus.
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

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
        setErreur(data.erreur ?? 'Erreur inconnue');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErreur('Erreur réseau');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          className="bg-white p-8 rounded-2xl shadow-md space-y-4"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">🎓 ÉcoleApp</h1>
            <p className="text-sm text-gray-500 mt-1">Connectez-vous à votre espace</p>
          </div>

          {erreur && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {erreur}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@ecole.tn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* ⭐ LIEN VERS L'INSCRIPTION — AJOUTÉ ICI */}
          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-sm text-gray-600">
              Pas encore inscrit ?{' '}
              <Link
                href="/inscription"
                className="text-blue-600 hover:underline font-medium"
              >
                Faire une demande d&apos;inscription
              </Link>
            </p>
          </div>
        </form>

        <InstallerEncart />
      </div>
    </div>
  );
}