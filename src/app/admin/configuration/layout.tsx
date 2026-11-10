import { redirect } from 'next/navigation';
import { getSession, aAccesConfig } from '@/lib/auth';

export default async function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const aAcces = await aAccesConfig();
  if (!aAcces) redirect('/admin/unlock');

  return <>{children}</>;
}