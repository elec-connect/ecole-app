import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();

  const inscriptions = await db.inscription.findMany({
    where: { classeId: id },
    include: {
      etudiant: {
        select: { id: true, nom: true, prenom: true, email: true },
      },
    },
    orderBy: { etudiant: { nom: 'asc' } },
  });

  return NextResponse.json(inscriptions.map((i) => i.etudiant));
});