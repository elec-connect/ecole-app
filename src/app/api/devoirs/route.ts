import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withProf } from '@/lib/api-helpers';

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const coursId = searchParams.get('coursId');

  const db = await getPrismaDynamic();

  const where: any = {};
  if (coursId) where.coursId = coursId;

  if (session.role === 'ETUDIANT') {
    const inscriptions = await db.inscription.findMany({
      where: { etudiantId: session.id },
      select: { classeId: true },
    });
    where.cours = { classeId: { in: inscriptions.map((i) => i.classeId) } };
  } else if (session.role === 'PROFESSEUR') {
    where.cours = { professeurId: session.id };
  }

  const devoirs = await db.devoir.findMany({
    where,
    include: { cours: { include: { matiere: true, classe: true } } },
    orderBy: { deadline: 'desc' },
  });

  return NextResponse.json(devoirs);
});

export const POST = withProf(async (req, session) => {
  const { coursId, titre, description, deadline, fichierUrl } = await req.json();

  if (!coursId || !titre || !deadline) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  const cours = await db.cours.findUnique({ where: { id: coursId } });
  if (!cours || cours.professeurId !== session.id) {
    return NextResponse.json({ erreur: 'Cours non autorisé' }, { status: 403 });
  }

  const devoir = await db.devoir.create({
    data: {
      coursId,
      titre,
      description: description || null,
      deadline: new Date(deadline),
      fichierUrl: fichierUrl || null,
    },
  });

  return NextResponse.json(devoir, { status: 201 });
});