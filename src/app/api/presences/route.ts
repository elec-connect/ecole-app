import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withProf } from '@/lib/api-helpers';
import { StatutPresence } from '@prisma/client';

export const POST = withProf(async (req) => {
  const { coursId, date, presences } = (await req.json()) as {
    coursId: string;
    date: string;
    presences: { etudiantId: string; statut: StatutPresence }[];
  };

  if (!coursId || !date || !Array.isArray(presences)) {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const dateObj = new Date(date);

  await db.$transaction(
    presences.map((p) =>
      db.presence.upsert({
        where: {
          coursId_etudiantId_date: { coursId, etudiantId: p.etudiantId, date: dateObj },
        },
        update: { statut: p.statut },
        create: { coursId, etudiantId: p.etudiantId, date: dateObj, statut: p.statut },
      })
    )
  );

  return NextResponse.json({ ok: true });
});

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const coursId = searchParams.get('coursId');
  const date = searchParams.get('date');

  if (!coursId || !date) {
    return NextResponse.json(
      { erreur: 'coursId et date requis' },
      { status: 400 }
    );
  }

  const db = await getPrismaDynamic();
  const presences = await db.presence.findMany({
    where: { coursId, date: new Date(date) },
  });

  return NextResponse.json(presences);
});