'use server';

import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function reinitialiserAnneeScolaire(anneeASupprimer: string) {
  // 1. VÉRIFICATION STRICTE DU RÔLE
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return { erreur: 'Action réservée au Super Administrateur.' };
  }

  if (!anneeASupprimer) {
    return { erreur: 'Veuillez sélectionner une année scolaire.' };
  }

  const db = await getPrismaDynamic();

  try {
    // ==========================================================
    // ÉTAPE 1 : RÉCOLTER LES DONNÉES HORS TRANSACTION (lecture seule)
    // ==========================================================
    const classes = await db.classe.findMany({
      where: { anneeScolaire: anneeASupprimer },
      include: {
        inscriptions: {
          include: {
            etudiant: { select: { id: true, nom: true, prenom: true, email: true } },
          },
        },
        cours: {
          include: {
            matiere: { select: { nom: true, coefficient: true } },
            professeur: { select: { id: true, nom: true, prenom: true, email: true } },
            salle: { select: { nom: true } },
          },
        },
        volumes: { include: { matiere: { select: { nom: true } } } },
      },
    });

    const professeurs = await db.user.findMany({
      where: { role: 'PROFESSEUR', actif: true },
      select: { id: true, nom: true, prenom: true, email: true },
    });

    const fraisScolarite = await db.fraisScolarite.findMany({
      where: { anneeScolaire: anneeASupprimer },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, email: true } },
        paiements: { orderBy: { datePaiement: 'asc' } },
      },
    });

    const tarifsProfesseurs = await db.tarifProfesseur.findMany({
      where: { anneeScolaire: anneeASupprimer },
      include: {
        professeur: { select: { id: true, nom: true, prenom: true, email: true } },
        paiements: { orderBy: { datePaiement: 'asc' } },
      },
    });

    const nbEleves = classes.reduce((acc, c) => acc + c.inscriptions.length, 0);
    const nbCours = classes.reduce((acc, c) => acc + c.cours.length, 0);
    const coursIds = classes.flatMap((c) => c.cours.map((co) => co.id));
    const nbNotes = await db.note.count({
      where: { evaluation: { coursId: { in: coursIds } } },
    });

    // ==========================================================
    // ÉTAPE 2 : CRÉER L'ARCHIVE (hors transaction)
    // ==========================================================
    await db.archive.create({
      data: {
        anneeScolaire: anneeASupprimer,
        nom: `Archive complète ${anneeASupprimer}`,
        type: 'complet',
        format: 'json',
        contenu: JSON.stringify({
          dateArchivage: new Date().toISOString(),
          anneeScolaire: anneeASupprimer,
          classes,
          professeurs,
          fraisScolarite,
          tarifsProfesseurs,
          statistiques: {
            nbClasses: classes.length,
            nbEleves,
            nbCours,
            nbNotes,
          },
        }),
        nbEleves,
        nbNotes,
        nbClasses: classes.length,
        createdById: session.id,
      },
    });

    // ==========================================================
    // ÉTAPE 3 : SUPPRIMER DANS UNE TRANSACTION COURTE
    // ==========================================================
    await db.$transaction(async (tx) => {
      // C.1 Notes
      await tx.note.deleteMany({
        where: { evaluation: { coursId: { in: coursIds } } },
      });

      // C.2 Évaluations
      await tx.evaluation.deleteMany({
        where: { coursId: { in: coursIds } },
      });

      // C.3 Présences
      await tx.presence.deleteMany({
        where: { coursId: { in: coursIds } },
      });

      // C.4 Devoirs
      await tx.devoir.deleteMany({
        where: { coursId: { in: coursIds } },
      });

      // C.5 Cours (emplois du temps)
      await tx.cours.deleteMany({
        where: { classe: { anneeScolaire: anneeASupprimer } },
      });

      // C.6 Volumes horaires
      await tx.volumeHoraire.deleteMany({
        where: { classe: { anneeScolaire: anneeASupprimer } },
      });

      // C.7 Inscriptions
      await tx.inscription.deleteMany({
        where: { anneeScolaire: anneeASupprimer },
      });

      // C.8 Comptabilité élèves
      await tx.paiement.deleteMany({
        where: { frais: { anneeScolaire: anneeASupprimer } },
      });
      await tx.fraisScolarite.deleteMany({
        where: { anneeScolaire: anneeASupprimer },
      });

      // C.9 Comptabilité professeurs
      await tx.paieProfesseur.deleteMany({
        where: { tarif: { anneeScolaire: anneeASupprimer } },
      });
      await tx.tarifProfesseur.deleteMany({
        where: { anneeScolaire: anneeASupprimer },
      });

      // C.10 Classes
      await tx.classe.deleteMany({
        where: { anneeScolaire: anneeASupprimer },
      });

      // C.11 Désactiver les professeurs (préserver historique)
      await tx.user.updateMany({
        where: { role: 'PROFESSEUR' },
        data: { actif: false },
      });

      // ⭐ C.12 Désactiver les élèves (pour qu'ils n'apparaissent plus comme actifs)
      await tx.user.updateMany({
        where: { role: 'ETUDIANT' },
        data: { actif: false },
      });
    }, {
      timeout: 60000, // 60 secondes pour éviter les timeouts
    });

    // ==========================================================
    // ÉTAPE 4 : REVALIDER LES PAGES
    // ==========================================================
    revalidatePath('/admin/archives');
    revalidatePath('/admin/classes');
    revalidatePath('/admin/reinitialisation');
    revalidatePath('/admin/comptabilite');
    revalidatePath('/admin/utilisateurs'); // ⭐ Pour rafraîchir la liste des utilisateurs

    return {
      succes: `Année ${anneeASupprimer} archivée et réinitialisée avec succès.`,
    };
  } catch (error: any) {
    console.error('[REINITIALISATION] Erreur:', error);
    return {
      erreur: error.message || 'Erreur lors de la réinitialisation.',
    };
  }
}