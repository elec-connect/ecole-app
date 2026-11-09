import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withRoles } from '@/lib/api-helpers';

export const GET = withRoles(['ADMIN', 'PROFESSEUR'], async (req) => {
  const { searchParams } = new URL(req.url);
  const anneeScolaire = searchParams.get('anneeScolaire');

  const db = await getPrismaDynamic();
  const classes = await db.classe.findMany({
    where: anneeScolaire ? { anneeScolaire } : {},
    include: {
      professeurPrincipal: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { inscriptions: true, cours: true } },
    },
    orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
  });

  return NextResponse.json(classes);
});

export const POST = withAdmin(async (req) => {
  const { nom, niveau, anneeScolaire, professeurPrincipalId } = await req.json();

  if (!nom || !niveau || !anneeScolaire) {
    return NextResponse.json(
      { erreur: 'nom, niveau et anneeScolaire requis' },
      { status: 400 }
    );
  }

  const db = await getPrismaDynamic();
  const classe = await db.classe.create({
    data: {
      nom,
      niveau,
      anneeScolaire,
      professeurPrincipalId: professeurPrincipalId || null,
    },
  });

  return NextResponse.json(classe, { status: 201 });
});