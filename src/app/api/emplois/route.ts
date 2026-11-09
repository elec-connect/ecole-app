import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');

  const db = await getPrismaDynamic();
  let where: any = {};

  if (mode === 'prof' && id) where.professeurId = id;
  else if (mode === 'eleve' && id) where.classeId = id;
  else if (mode === 'salle' && id) where.salleId = id;

  const cours = await db.cours.findMany({
    where,
    include: {
      classe: true,
      matiere: true,
      professeur: { select: { id: true, nom: true, prenom: true, email: true } },
      salle: { select: { id: true, nom: true, type: true } },
    },
    orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
  });

  return NextResponse.json(cours);
});