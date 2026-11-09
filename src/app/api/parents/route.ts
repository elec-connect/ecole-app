import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async () => {
  const db = await getPrismaDynamic();
  const parents = await db.user.findMany({
    where: { role: 'PARENT', actif: true },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      enfants: {
        include: {
          eleve: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              inscriptions: {
                include: { classe: true },
                orderBy: { anneeScolaire: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });
  return NextResponse.json(parents);
});

export const POST = withAdmin(async (req) => {
  const { parentId, eleveId, relation } = await req.json();

  if (!parentId || !eleveId) {
    return NextResponse.json({ erreur: 'parentId et eleveId requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  try {
    const lien = await db.parentEleve.create({
      data: {
        parentId,
        eleveId,
        relation: relation || null,
      },
    });
    return NextResponse.json(lien, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ erreur: 'Ce parent est déjà lié à cet élève' }, { status: 409 });
    }
    throw e;
  }
});