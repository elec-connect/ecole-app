import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

// Liens accessibles à tous les admins
const ITEMS_BASE = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥' },
  { href: '/admin/classes', label: 'Classes', icon: '🏫' },
  { href: '/admin/matieres', label: 'Matières', icon: '📚' },
  { href: '/admin/salles', label: 'Salles', icon: '🚪' },
  { href: '/admin/volume-horaire', label: 'Volume horaire', icon: '⏱️' },
  { href: '/admin/cours', label: 'Cours', icon: '📖' },
  { href: '/admin/emplois', label: 'Emplois du temps', icon: '🗓️' },
  { href: '/admin/emplois/generer', label: 'Générer emploi', icon: '🤖' },
  { href: '/admin/moyennes', label: 'Moyennes', icon: '📈' },
  { href: '/admin/archives', label: 'Archives', icon: '📦' },
];

// Lien réservé au SUPER_ADMIN
const ITEM_CONFIG = { href: '/admin/configuration', label: 'Configuration', icon: '⚙️' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Accepter SUPER_ADMIN et ADMIN
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const user = await db.user.findUnique({ where: { id: session.id } });
  const config = await getConfig();

  // ⭐ Configuration visible uniquement par le SUPER_ADMIN
  const items =
    session.role === 'SUPER_ADMIN' ? [...ITEMS_BASE, ITEM_CONFIG] : ITEMS_BASE;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar items={items} titre="Espace Admin" logoUrl={config.logoUrl} />
      <div className="flex-1 flex flex-col">
        <Header
          nomUtilisateur={user ? user.prenom + ' ' + user.nom : undefined}
          role={session.role === 'SUPER_ADMIN' ? 'Super Administrateur' : 'Administrateur'}
          homeHref="/admin/dashboard"
          homeLabel="Tableau de bord"
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}