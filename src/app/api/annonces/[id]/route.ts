import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';

export const DELETE = withAuth(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();

  const annonce = await db.annonce.findUnique({ where: { id } });
  if (!annonce) {
    return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });
  }

  // Seul le prof auteur (ou un admin) peut supprimer
  const isAuthor = annonce.professeurId === session.id;
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN';
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 });
  }

  await db.annonce.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});