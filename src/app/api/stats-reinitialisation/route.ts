import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const annee = searchParams.get('annee');

  if (!annee) {
    return NextResponse.json({ erreur: 'Année requise' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  const [nbClasses, nbInscriptions, nbFrais, nbTarifs] = await Promise.all([
    db.classe.count({ where: { anneeScolaire: annee } }),
    db.inscription.count({ where: { anneeScolaire: annee } }),
    db.fraisScolarite.count({ where: { anneeScolaire: annee } }),
    db.tarifProfesseur.count({ where: { anneeScolaire: annee } }),
  ]);

  return NextResponse.json({ nbClasses, nbInscriptions, nbFrais, nbTarifs });
}