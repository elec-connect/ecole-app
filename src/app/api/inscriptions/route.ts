import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const POST = withAdmin(async (req) => {
  const { etudiantId, classeId, anneeScolaire } = await req.json();

  if (!etudiantId || !classeId || !anneeScolaire) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  try {
    // 1. Vérifier que l'élève existe
    const etudiant = await db.user.findUnique({
      where: { id: etudiantId },
      select: { id: true, actif: true, nom: true, prenom: true },
    });

    if (!etudiant) {
      return NextResponse.json({ erreur: 'Élève introuvable' }, { status: 404 });
    }

    // 2. Vérifier que la classe existe
    const classe = await db.classe.findUnique({
      where: { id: classeId },
      select: { id: true, nom: true, anneeScolaire: true },
    });

    if (!classe) {
      return NextResponse.json({ erreur: 'Classe introuvable' }, { status: 404 });
    }

    // 3. Vérifier que l'inscription n'existe pas déjà
    const inscriptionExistante = await db.inscription.findUnique({
      where: {
        etudiantId_classeId_anneeScolaire: {
          etudiantId,
          classeId,
          anneeScolaire: classe.anneeScolaire, // Utiliser l'année de la classe
        },
      },
    });

    if (inscriptionExistante) {
      return NextResponse.json(
        { erreur: 'Cet élève est déjà inscrit dans cette classe pour cette année.' },
        { status: 409 }
      );
    }

    // 4. Créer l'inscription + Réactiver l'élève (transaction)
    const inscription = await db.$transaction(async (tx) => {
      // Créer l'inscription
      const ins = await tx.inscription.create({
        data: {
          etudiantId,
          classeId,
          anneeScolaire: classe.anneeScolaire,
        },
      });

      // ⭐ Réactiver l'élève s'il était inactif
      if (!etudiant.actif) {
        await tx.user.update({
          where: { id: etudiantId },
          data: { actif: true },
        });
      }

      return ins;
    });

    return NextResponse.json(
      {
        ...inscription,
        message: `Élève ${etudiant.prenom} ${etudiant.nom} inscrit dans ${classe.nom} et réactivé.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[INSCRIPTION] Erreur:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { erreur: 'Cet élève est déjà inscrit dans cette classe.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { erreur: error.message || 'Erreur lors de l\'inscription' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ erreur: 'id requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  await db.inscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});