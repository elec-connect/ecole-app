import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withProf } from '@/lib/api-helpers';

export const DELETE = withProf(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});