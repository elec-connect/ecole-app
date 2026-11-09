import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withRoles } from '@/lib/api-helpers';

export const GET = withRoles(['PROFESSEUR', 'ADMIN'], async (req) => {
  const { searchParams } = new URL(req.url);
  const classeId = searchParams.get('classeId');

  const db = await getPrismaDynamic();
  const etudiants = await db.user.findMany({
    where: {
      role: 'ETUDIANT',
      actif: true,
      ...(classeId ? { inscriptions: { some: { classeId } } } : {}),
    },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  return NextResponse.json(etudiants);
});