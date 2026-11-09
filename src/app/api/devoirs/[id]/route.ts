import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withProf } from '@/lib/api-helpers';

export const DELETE = withProf(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();

  const devoir = await db.devoir.findUnique({
    where: { id },
    include: { cours: true },
  });

  if (!devoir || devoir.cours.professeurId !== session.id) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 });
  }

  await db.devoir.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});