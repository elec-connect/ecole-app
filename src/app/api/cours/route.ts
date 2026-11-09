import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const classeId = searchParams.get('classeId');
  const professeurId = searchParams.get('professeurId');

  const filtreProf = session.role === 'PROFESSEUR' ? { professeurId: session.id } : {};

  const db = await getPrismaDynamic();
  const cours = await db.cours.findMany({
    where: {
      ...filtreProf,
      ...(classeId && { classeId }),
      ...(professeurId && session.role === 'ADMIN' && { professeurId }),
    },
    include: {
      classe: true,
      matiere: true,
      professeur: { select: { id: true, nom: true, prenom: true, email: true } },
      salle: { select: { id: true, nom: true, type: true } },
      _count: { select: { presences: true, devoirs: true, evaluations: true } },
    },
    orderBy: [
      { jourSemaine: 'asc' },
      { heureDebut: 'asc' },
    ],
  });

  return NextResponse.json(cours);
});

export const POST = withAdmin(async (req) => {
  const { classeId, matiereId, professeurId, jourSemaine, heureDebut, heureFin, salleId } = await req.json();

  if (!classeId || !matiereId || !professeurId || jourSemaine === undefined) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  const conflit = await db.cours.findFirst({
    where: {
      OR: [{ professeurId }, { classeId }],
      jourSemaine,
      AND: [
        { heureDebut: { lt: heureFin } },
        { heureFin: { gt: heureDebut } },
      ],
    },
  });

  if (conflit) {
    return NextResponse.json({ erreur: 'Conflit horaire (prof ou classe déjà occupé)' }, { status: 409 });
  }

  const cours = await db.cours.create({
    data: {
      classeId,
      matiereId,
      professeurId,
      jourSemaine,
      heureDebut,
      heureFin,
      salleId: salleId || null,
    },
  });

  return NextResponse.json(cours, { status: 201 });
});