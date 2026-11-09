import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';
import { NotesGrid } from '@/components/prof/NotesGrid';

export default async function NotesCoursPage({
  params,
}: {
  params: Promise<{ coursId: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { coursId } = await params;
  const db = await getPrismaDynamic();

  const cours = await db.cours.findUnique({
    where: { id: coursId },
    include: { classe: true, matiere: true },
  });

  if (!cours || cours.professeurId !== session.id) redirect('/prof/notes');

  const etudiants = await db.user.findMany({
    where: {
      role: 'ETUDIANT',
      inscriptions: { some: { classeId: cours.classeId } },
    },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  const evaluations = await db.evaluation.findMany({
    where: { coursId },
    include: { notes: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {cours.matiere.nom} — {cours.classe.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          {etudiants.length} élèves · {evaluations.length} évaluation(s)
        </p>
      </div>

      <NotesGrid
        coursId={cours.id}
        matiereId={cours.matiereId}
        etudiants={JSON.parse(JSON.stringify(etudiants))}
        evaluationsInitiales={JSON.parse(JSON.stringify(evaluations))}
      />
    </div>
  );
}