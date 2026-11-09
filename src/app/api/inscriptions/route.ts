import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const POST = withAdmin(async (req) => {
  const { etudiantId, classeId, anneeScolaire } = await req.json();

  if (!etudiantId || !classeId || !anneeScolaire) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const inscription = await db.inscription.create({
    data: { etudiantId, classeId, anneeScolaire },
  });

  return NextResponse.json(inscription, { status: 201 });
});

export const DELETE = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ erreur: 'id requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  await db.inscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});