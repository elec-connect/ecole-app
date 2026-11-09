import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withProf } from '@/lib/api-helpers';
import { TypeNote } from '@prisma/client';

export const POST = withProf(async (req) => {
  const { etudiantId, matiereId, evaluationId, type, valeur, coefficient, commentaire } = await req.json();

  if (!etudiantId || !matiereId || valeur === undefined) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }
  if (valeur < 0 || valeur > 20) {
    return NextResponse.json({ erreur: 'Note entre 0 et 20' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  if (evaluationId) {
    const note = await db.note.upsert({
      where: { etudiantId_evaluationId: { etudiantId, evaluationId } },
      update: { valeur },
      create: {
        etudiantId,
        matiereId,
        evaluationId,
        type: (type ?? 'CONTROLE') as TypeNote,
        valeur,
        coefficient: coefficient ?? 1,
      },
    });
    return NextResponse.json(note, { status: 201 });
  }

  const note = await db.note.create({
    data: {
      etudiantId,
      matiereId,
      type: (type ?? 'CONTROLE') as TypeNote,
      valeur,
      coefficient: coefficient ?? 1,
      commentaire: commentaire ?? null,
    },
  });
  return NextResponse.json(note, { status: 201 });
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const etudiantId = searchParams.get('etudiantId') ?? session.id;
  if (session.role === 'ETUDIANT' && session.id !== etudiantId) {
    return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  const db = await getPrismaDynamic();
  const notes = await db.note.findMany({
    where: { etudiantId },
    include: { matiere: true, evaluation: true },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(notes);
});