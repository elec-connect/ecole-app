import { redirect } from 'next/navigation';
import { getSession, aAccesConfig } from '@/lib/auth';

export default async function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // 1) Non connecté → login
  if (!session) {
    redirect('/login');
  }

  // 2) Pas SUPER_ADMIN → retour dashboard (même pas le droit de tenter le déverrouillage)
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard');
  }

  // 3) SUPER_ADMIN mais session de config non déverrouillée → page de déverrouillage
  const aAcces = await aAccesConfig();
  if (!aAcces) redirect('/admin/unlock');

  return <>{children}</>;
}