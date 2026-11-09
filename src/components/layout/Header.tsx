'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Props {
  nomUtilisateur?: string;
  role?: string;
  homeHref?: string;
  homeLabel?: string;
}

export function Header({ nomUtilisateur, role, homeHref, homeLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  // Affiche le bouton retour seulement si on n'est pas déjà sur homeHref
  const showBack = homeHref && pathname !== homeHref;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href={homeHref}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
          >
            <span>←</span>
            <span>{homeLabel ?? 'Retour'}</span>
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{nomUtilisateur ?? 'Utilisateur'}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}