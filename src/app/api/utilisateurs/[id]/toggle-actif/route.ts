import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdminOrSuper } from '@/lib/api-helpers';

// ADMIN et SUPER_ADMIN peuvent activer/désactiver
export const POST = withAdminOrSuper(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  if (id === session.id) {
    return NextResponse.json(
      { erreur: 'Impossible de modifier votre propre statut' },
      { status: 400 }
    );
  }

  const db = await getPrismaDynamic();
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });

  const updated = await db.user.update({
    where: { id },
    data: { actif: !user.actif },
    select: { id: true, actif: true },
  });

  return NextResponse.json(updated);
});