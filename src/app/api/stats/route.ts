import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async () => {
  const db = await getPrismaDynamic();

  const [nbEleves, nbProfs, nbClasses, nbMatieres, nbCours, nbNotes, nbAbsences] =
    await Promise.all([
      db.user.count({ where: { role: 'ETUDIANT', actif: true } }),
      db.user.count({ where: { role: 'PROFESSEUR', actif: true } }),
      db.classe.count(),
      db.matiere.count(),
      db.cours.count(),
      db.note.count(),
      db.presence.count({ where: { statut: 'ABSENT' } }),
    ]);

  return NextResponse.json({
    nbEleves,
    nbProfs,
    nbClasses,
    nbMatieres,
    nbCours,
    nbNotes,
    nbAbsences,
  });
});