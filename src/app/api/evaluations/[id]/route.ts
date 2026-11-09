import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withProf } from '@/lib/api-helpers';

export const PUT = withProf(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();
  const evaluation = await db.evaluation.update({
    where: { id },
    data: {
      ...(body.nom && { nom: body.nom }),
      ...(body.type && { type: body.type }),
      ...(body.coefficient !== undefined && { coefficient: body.coefficient }),
    },
  });
  return NextResponse.json(evaluation);
});

export const DELETE = withProf(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.evaluation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});