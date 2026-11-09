import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

const ITEMS = [
  { href: '/prof/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/prof/appel', label: 'Faire l'appel', icon: '✅' },
  { href: '/prof/notes', label: 'Saisir des notes', icon: '📝' },
  { href: '/prof/devoirs', label: 'Devoirs', icon: '📚' },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'PROFESSEUR') redirect('/login');

  const db = await getPrismaDynamic();
  const user = await db.user.findUnique({ where: { id: session.id } });
  const config = await getConfig();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar items={ITEMS} titre="Espace Professeur" logoUrl={config.logoUrl} />
      <div className="flex-1 flex flex-col">
        <Header
          nomUtilisateur={user ? user.prenom + ' ' + user.nom : undefined}
          role="Professeur"
          homeHref="/prof/dashboard"
          homeLabel="Tableau de bord"
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}