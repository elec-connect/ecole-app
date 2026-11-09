import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withProf } from '@/lib/api-helpers';
import { TypeNote } from '@prisma/client';

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const coursId = searchParams.get('coursId');
  if (!coursId) return NextResponse.json({ erreur: 'coursId requis' }, { status: 400 });

  const db = await getPrismaDynamic();
  const evaluations = await db.evaluation.findMany({
    where: { coursId },
    include: { notes: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(evaluations);
});

export const POST = withProf(async (req, session) => {
  const { coursId, nom, type, coefficient } = await req.json();
  if (!coursId || !nom || !type) {
    return NextResponse.json({ erreur: 'coursId, nom et type requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const cours = await db.cours.findUnique({ where: { id: coursId } });
  if (!cours || cours.professeurId !== session.id) {
    return NextResponse.json({ erreur: 'Cours non autorisé' }, { status: 403 });
  }

  const evaluation = await db.evaluation.create({
    data: {
      coursId,
      nom,
      type: type as TypeNote,
      coefficient: coefficient ?? 1,
    },
  });
  return NextResponse.json(evaluation, { status: 201 });
});