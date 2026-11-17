import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withAdmin } from '@/lib/api-helpers';

// ⭐ GET : autorise tous les utilisateurs connectés (avecAuth)
// pour que la page /admin/utilisateurs puisse charger la liste des classes
export const GET = withAuth(async (req) => {
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
  
  const existante = await db.classe.findFirst({
    where: { nom, anneeScolaire },
  });

  if (existante) {
    return NextResponse.json(
      { erreur: `La classe ${nom} existe déjà pour l'année ${anneeScolaire}.` },
      { status: 409 }
    );
  }

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

export const DELETE = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const all = searchParams.get('all');

  const db = await getPrismaDynamic();

  if (all === 'true') {
    try {
      await db.cours.deleteMany({});
      await db.volumeHoraire.deleteMany({});
      await db.inscription.deleteMany({});
      
      const result = await db.classe.deleteMany({});

      return NextResponse.json({
        ok: true,
        message: `${result.count} classe(s) supprimée(s).`,
      });
    } catch (error: any) {
      console.error('[CLASSES DELETE ALL] Erreur:', error);
      return NextResponse.json(
        { erreur: error.message || 'Erreur lors de la suppression globale' },
        { status: 500 }
      );
    }
  }

  if (!id) {
    return NextResponse.json(
      { erreur: 'id ou all=true requis' },
      { status: 400 }
    );
  }

  try {
    await db.classe.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[CLASSE DELETE] Erreur:', error);
    return NextResponse.json(
      { erreur: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
});