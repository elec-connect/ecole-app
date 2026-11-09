import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withAdmin } from '@/lib/api-helpers';

export const GET = withAuth(async () => {
  const db = await getPrismaDynamic();
  const salles = await db.salle.findMany({
    include: {
      _count: { select: { cours: true } },
      matieres: { select: { id: true, nom: true, coefficient: true } },
    },
    orderBy: { nom: 'asc' },
  });
  return NextResponse.json(salles);
});

export const POST = withAdmin(async (req) => {
  const { nom, capacite, type, batiment, matiereIds } = await req.json();
  if (!nom) return NextResponse.json({ erreur: 'nom requis' }, { status: 400 });

  const db = await getPrismaDynamic();
  const salle = await db.salle.create({
    data: {
      nom,
      capacite: capacite ? parseInt(capacite) : null,
      type: type || null,
      batiment: batiment || null,
      ...(Array.isArray(matiereIds) && matiereIds.length > 0
        ? { matieres: { connect: matiereIds.map((id: string) => ({ id })) } }
        : {}),
    },
    include: { matieres: { select: { id: true, nom: true } } },
  });
  return NextResponse.json(salle, { status: 201 });
});