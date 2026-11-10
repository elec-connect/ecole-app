import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BulletinComplet } from '@/components/bulletin/BulletinComplet';

export default async function EtudiantBulletinPage() {
  const session = await getSession();
  if (!session || session.role !== 'ETUDIANT') redirect('/login');

  // Récupérer les données du bulletin
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/bulletin/complet`, {
    headers: {
      cookie: `session=${(await import('next/headers')).cookies().then((c) => c.get('session')?.value)}`,
    },
    cache: 'no-store',
  });

  // Alternative : appeler directement la logique
  // Pour éviter le fetch interne, on va importer la logique

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon bulletin</h1>
        <p className="text-gray-500 mt-1">Bulletin détaillé avec toutes les notes</p>
      </div>
      <BulletinFetcher etudiantId={session.id} />
    </div>
  );
}

async function BulletinFetcher({ etudiantId }: { etudiantId: string }) {
  const { cookies } = await import('next/headers');
  const token = (await cookies()).get('session')?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/bulletin/complet?etudiantId=${etudiantId}`, {
    headers: { cookie: `session=${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return <div className="text-red-600">Erreur de chargement du bulletin</div>;
  }

  const data = await res.json();
  return <BulletinComplet data={data} etudiantId={etudiantId} anneeScolaire={data.classe.anneeScolaire} />;
}