import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { BulletinComplet } from '@/components/bulletin/BulletinComplet';

export default async function ParentBulletinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'PARENT') redirect('/login');

  const { id } = await params;
  const db = await getPrismaDynamic();

  const lien = await db.parentEleve.findUnique({
    where: { parentId_eleveId: { parentId: session.id, eleveId: id } },
  });
  if (!lien) notFound();

  const { cookies } = await import('next/headers');
  const token = (await cookies()).get('session')?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/bulletin/complet?etudiantId=${id}`, {
    headers: { cookie: `session=${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return <div className="text-red-600">Erreur de chargement</div>;
  }

  const data = await res.json();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/parent/dashboard" className="text-sm text-blue-600 hover:underline print:hidden">
        ← Retour
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bulletin de {data.eleve.prenom} {data.eleve.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          {data.classe.nom} — {data.classe.anneeScolaire}
        </p>
      </div>
      <BulletinComplet
        data={data}
        etudiantId={id}
        anneeScolaire={data.classe.anneeScolaire}
      />
    </div>
  );
}