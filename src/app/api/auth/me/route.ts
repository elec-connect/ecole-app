import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, session) => {
  const db = await getPrismaDynamic();
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
  });

  if (!user) {
    return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json(user);
});