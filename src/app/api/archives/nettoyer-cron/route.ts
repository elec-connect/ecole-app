import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';

export const GET = async (req: Request) => {
  // Lire la config chiffrée
  const config = await getConfig();
  const cronSecret = config.cronSecret;

  if (!cronSecret) {
    return NextResponse.json(
      { erreur: 'Cron Secret non configuré. Allez dans /admin/configuration.' },
      { status: 500 }
    );
  }

  // Vérifier le secret Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 });
  }

  const db = await getPrismaDynamic();

  const dateLimite = new Date();
  dateLimite.setFullYear(dateLimite.getFullYear() - 10);

  const archivesASupprimer = await db.archive.findMany({
    where: { createdAt: { lt: dateLimite } },
    select: { id: true, nom: true, anneeScolaire: true },
  });

  if (archivesASupprimer.length === 0) {
    return NextResponse.json({
      ok: true,
      nbSupprimees: 0,
      message: 'Aucune archive de plus de 10 ans.',
    });
  }

  const resultat = await db.archive.deleteMany({
    where: { createdAt: { lt: dateLimite } },
  });

  return NextResponse.json({
    ok: true,
    nbSupprimees: resultat.count,
    dateLimite: dateLimite.toISOString(),
    details: archivesASupprimer,
  });
};