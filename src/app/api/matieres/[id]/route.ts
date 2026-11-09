import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const PUT = withAdmin(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();

  const matiere = await db.matiere.update({
    where: { id },
    data: {
      ...(body.nom && { nom: body.nom }),
      ...(body.coefficient !== undefined && { coefficient: body.coefficient }),
    },
  });

  return NextResponse.json(matiere);
});

export const DELETE = withAdmin(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.matiere.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});