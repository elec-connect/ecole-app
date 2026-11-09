import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async () => {
  const db = await getPrismaDynamic();
  const matieres = await db.matiere.findMany({
    include: { _count: { select: { cours: true, notes: true } } },
    orderBy: { nom: 'asc' },
  });
  return NextResponse.json(matieres);
});

export const POST = withAdmin(async (req) => {
  const { nom, coefficient } = await req.json();
  if (!nom) {
    return NextResponse.json({ erreur: 'nom requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const matiere = await db.matiere.create({
    data: { nom, coefficient: coefficient ?? 1 },
  });

  return NextResponse.json(matiere, { status: 201 });
});