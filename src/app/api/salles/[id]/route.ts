import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const PUT = withAdmin(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();

  const data: any = {
    ...(body.nom && { nom: body.nom }),
    ...(body.capacite !== undefined && { capacite: body.capacite ? parseInt(body.capacite) : null }),
    ...(body.type !== undefined && { type: body.type || null }),
    ...(body.batiment !== undefined && { batiment: body.batiment || null }),
  };

  if (Array.isArray(body.matiereIds)) {
    data.matieres = { set: body.matiereIds.map((mid: string) => ({ id: mid })) };
  }

  const salle = await db.salle.update({
    where: { id },
    data,
    include: { matieres: { select: { id: true, nom: true } } },
  });
  return NextResponse.json(salle);
});

export const DELETE = withAdmin(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.salle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});