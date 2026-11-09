import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  const cours = await db.cours.findUnique({
    where: { id },
    include: {
      classe: true,
      matiere: true,
      professeur: { select: { id: true, nom: true, prenom: true, email: true } },
      devoirs: { orderBy: { deadline: 'desc' } },
      evaluations: { include: { notes: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!cours) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });
  return NextResponse.json(cours);
});

export const PUT = withAdmin(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();
  const cours = await db.cours.update({
    where: { id },
    data: {
      ...(body.classeId && { classeId: body.classeId }),
      ...(body.matiereId && { matiereId: body.matiereId }),
      ...(body.professeurId && { professeurId: body.professeurId }),
      ...(body.jourSemaine !== undefined && { jourSemaine: body.jourSemaine }),
      ...(body.heureDebut && { heureDebut: body.heureDebut }),
      ...(body.heureFin && { heureFin: body.heureFin }),
    },
  });
  return NextResponse.json(cours);
});

export const DELETE = withAdmin(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.cours.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});