import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const POST = withAdmin(async (req) => {
  const { etudiantIds, classeSourceId, classeDestinationId, anneeScolaire } = await req.json();

  if (!etudiantIds || !Array.isArray(etudiantIds) || etudiantIds.length === 0) {
    return NextResponse.json({ erreur: 'Aucun élève sélectionné' }, { status: 400 });
  }
  if (!classeDestinationId) {
    return NextResponse.json({ erreur: 'Classe de destination requise' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  try {
    const result = await db.$transaction(async (tx) => {
      let nbTransferes = 0;

      for (const etudiantId of etudiantIds) {
        // 1. Supprimer l'ancienne inscription dans la classe source
        if (classeSourceId) {
          await tx.inscription.deleteMany({
            where: {
              etudiantId,
              classeId: classeSourceId,
              anneeScolaire,
            },
          });
        }

        // 2. Vérifier si l'élève est déjà dans la destination
        const existante = await tx.inscription.findFirst({
          where: {
            etudiantId,
            classeId: classeDestinationId,
            anneeScolaire,
          },
        });

        // 3. Créer la nouvelle inscription
        if (!existante) {
          await tx.inscription.create({
            data: {
              etudiantId,
              classeId: classeDestinationId,
              anneeScolaire,
            },
          });
        }

        // 4. Réactiver l'élève au cas où
        await tx.user.update({
          where: { id: etudiantId },
          data: { actif: true },
        });

        nbTransferes++;
      }

      return nbTransferes;
    });

    return NextResponse.json({
      ok: true,
      nbTransferes: result,
      message: `${result} élève(s) transféré(s) avec succès.`,
    });
  } catch (error: any) {
    console.error('[TRANSFERT] Erreur:', error);
    return NextResponse.json(
      { erreur: error.message || 'Erreur lors du transfert' },
      { status: 500 }
    );
  }
});