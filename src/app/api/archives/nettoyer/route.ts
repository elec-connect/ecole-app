import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const POST = withAdmin(async () => {
  const db = await getPrismaDynamic();

  // Calculer la date limite : 10 ans en arrière
  const dateLimite = new Date();
  dateLimite.setFullYear(dateLimite.getFullYear() - 10);

  // Trouver les archives à supprimer
  const archivesASupprimer = await db.archive.findMany({
    where: { createdAt: { lt: dateLimite } },
    select: { id: true, nom: true, anneeScolaire: true, createdAt: true },
  });

  if (archivesASupprimer.length === 0) {
    return NextResponse.json({
      ok: true,
      nbSupprimees: 0,
      message: 'Aucune archive de plus de 10 ans à supprimer.',
    });
  }

  // Supprimer
  const resultat = await db.archive.deleteMany({
    where: { createdAt: { lt: dateLimite } },
  });

  return NextResponse.json({
    ok: true,
    nbSupprimees: resultat.count,
    dateLimite: dateLimite.toISOString(),
    details: archivesASupprimer,
  });
});