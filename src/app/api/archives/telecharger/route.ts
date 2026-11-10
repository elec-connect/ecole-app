import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ erreur: 'id requis' }, { status: 400 });

  const db = await getPrismaDynamic();
  const archive = await db.archive.findUnique({ where: { id } });
  if (!archive) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });

  return new NextResponse(archive.contenu, {
    headers: {
      'Content-Type': archive.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="archive-${archive.anneeScolaire.replace(/[^a-z0-9]/gi, '-')}.${archive.format}"`,
    },
  });
});