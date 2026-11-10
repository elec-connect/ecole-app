import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async () => {
  const db = await getPrismaDynamic();
  const archives = await db.archive.findMany({
    select: {
      id: true,
      anneeScolaire: true,
      nom: true,
      type: true,
      format: true,
      nbClasses: true,
      nbEleves: true,
      nbNotes: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(archives);
});

export const DELETE = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ erreur: 'id requis' }, { status: 400 });

  const db = await getPrismaDynamic();
  await db.archive.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});