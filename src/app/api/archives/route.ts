import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const annee = searchParams.get('annee');

  const db = await getPrismaDynamic();

  // Si une année est demandée, retourner les classes de cette année
  if (annee) {
    const classes = await db.classe.findMany({
      where: { anneeScolaire: annee },
      include: {
        _count: {
          select: {
            inscriptions: true,
            cours: true,
          },
        },
        professeurPrincipal: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
    });

    // Compter les données liées (notes, présences) pour information
    const classeIds = classes.map((c) => c.id);

    const nbNotes = await db.note.count({
      where: {
        etudiant: {
          inscriptions: { some: { classeId: { in: classeIds } } },
        },
      },
    });

    const nbPresences = await db.presence.count({
      where: {
        cours: { classeId: { in: classeIds } },
      },
    });

    return NextResponse.json({
      classes,
      stats: {
        nbClasses: classes.length,
        nbEleves: classes.reduce((sum, c) => sum + c._count.inscriptions, 0),
        nbCours: classes.reduce((sum, c) => sum + c._count.cours, 0),
        nbNotes,
        nbPresences,
      },
    });
  }

  // Sinon, retourner la liste des années scolaires distinctes
  const annees = await db.classe.findMany({
    select: { anneeScolaire: true },
    distinct: ['anneeScolaire'],
    orderBy: { anneeScolaire: 'desc' },
  });

  return NextResponse.json({
    annees: annees.map((a) => a.anneeScolaire),
  });
});