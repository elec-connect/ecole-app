import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const classeId = searchParams.get('classeId');

  const db = await getPrismaDynamic();

  const matieres = await db.matiere.findMany({ orderBy: { nom: 'asc' } });

  const volumes = classeId
    ? await db.volumeHoraire.findMany({ where: { classeId } })
    : [];

  return NextResponse.json({ matieres, volumes });
});

export const POST = withAdmin(async (req) => {
  const { classeId, volumes } = await req.json();

  if (!classeId || !Array.isArray(volumes)) {
    return NextResponse.json({ erreur: 'classeId et volumes requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  for (const v of volumes) {
    await db.volumeHoraire.upsert({
      where: { classeId_matiereId: { classeId, matiereId: v.matiereId } },
      update: { heures: v.heures, coefficient: v.coefficient },
      create: {
        classeId,
        matiereId: v.matiereId,
        heures: v.heures,
        coefficient: v.coefficient,
      },
    });
  }

  return NextResponse.json({ ok: true });
});