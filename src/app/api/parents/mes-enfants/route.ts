import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, session) => {
  if (session.role !== 'PARENT') {
    return NextResponse.json({ erreur: 'Réservé aux parents' }, { status: 403 });
  }

  const db = await getPrismaDynamic();
  const liens = await db.parentEleve.findMany({
    where: { parentId: session.id },
    include: {
      eleve: {
        include: {
          inscriptions: {
            include: { classe: true },
            orderBy: { anneeScolaire: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  return NextResponse.json(liens);
});