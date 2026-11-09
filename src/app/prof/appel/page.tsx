import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { AppelTable } from '@/components/prof/AppelTable';

export default async function AppelPage() {
  const session = await getSession();
  if (!session) return null;

  const db = await getPrismaDynamic();
  const cours = await db.cours.findMany({
    where: { professeurId: session.id },
    include: { classe: true, matiere: true },
    orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Faire l&apos;appel</h1>
        <p className="text-gray-500 mt-1">Sélectionnez un cours puis marquez les présences</p>
      </div>
      <AppelTable cours={JSON.parse(JSON.stringify(cours))} />
    </div>
  );
}