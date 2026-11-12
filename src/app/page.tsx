import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'SUPER_ADMIN') redirect('/admin/dashboard');
  if (session.role === 'ADMIN') redirect('/admin/dashboard');
  if (session.role === 'PROFESSEUR') redirect('/prof/dashboard');
  if (session.role === 'ETUDIANT') redirect('/etudiant/dashboard');
  if (session.role === 'PARENT') redirect('/parent/dashboard');

  redirect('/login');
}