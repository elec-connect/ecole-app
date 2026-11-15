'use server';

import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { revalidatePath } from 'next/cache';

export async function reinitialiserAnneeScolaire() {
  // 1. VÉRIFICATION STRICTE DU RÔLE
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return { erreur: 'Action réservée au Super Administrateur.' };
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const anneeActuelle = config.anneeScolaireCourante;

  if (!anneeActuelle) {
    return { erreur: 'Année scolaire non configurée.' };
  }

  try {
    await db.$transaction(async (tx) => {
      // ============================
      // A. RÉCOLTER TOUTES LES DONNÉES À ARCHIVER
      // ============================
      const classes = await tx.classe.findMany({
        where: { anneeScolaire: anneeActuelle },
        include: {
          inscriptions: {
            include: {
              etudiant: {
                select: { id: true, nom: true, prenom: true, email: true },
              },
            },
          },
          cours: {
            include: {
              matiere: { select: { nom: true, coefficient: true } },
              professeur: { select: { id: true, nom: true, prenom: true, email: true } },
              salle: { select: { nom: true } },
            },
          },
          volumes: {
            include: { matiere: { select: { nom: true } } },
          },
        },
      });

      const professeurs = await tx.user.findMany({
        where: { role: 'PROFESSEUR', actif: true },
        select: { id: true, nom: true, prenom: true, email: true },
      });

      // Calcul des statistiques
      const nbEleves = classes.reduce((acc, c) => acc + c.inscriptions.length, 0);
      const nbCours = classes.reduce((acc, c) => acc + c.cours.length, 0);

      // Compter les notes pour l'année (via les cours de cette année)
      const coursIds = classes.flatMap((c) => c.cours.map((co) => co.id));
      const nbNotes = await tx.note.count({
        where: { evaluation: { coursId: { in: coursIds } } },
      });

      // ============================
      // B. CRÉER L'ARCHIVE
      // ============================
      await tx.archive.create({
        data: {
          anneeScolaire: anneeActuelle,
          nom: `Archive complète ${anneeActuelle}`,
          type: 'complet',
          format: 'json',
          contenu: JSON.stringify({
            dateArchivage: new Date().toISOString(),
            anneeScolaire: anneeActuelle,
            classes,
            professeurs,
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

      // ============================
      // C. SUPPRIMER DANS LE BON ORDRE
      // ============================

      // C.1 Notes (liées aux évaluations, qui sont liées aux cours)
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
        where: { classe: { anneeScolaire: anneeActuelle } },
      });

      // C.6 Volumes horaires
      await tx.volumeHoraire.deleteMany({
        where: { classe: { anneeScolaire: anneeActuelle } },
      });

      // C.7 Inscriptions
      await tx.inscription.deleteMany({
        where: { anneeScolaire: anneeActuelle },
      });

      // C.8 Classes
      await tx.classe.deleteMany({
        where: { anneeScolaire: anneeActuelle },
      });

      // C.9 Désactiver les professeurs (au lieu de les supprimer,
      //     pour préserver l'historique des messages/relations)
      await tx.user.updateMany({
        where: { role: 'PROFESSEUR' },
        data: { actif: false },
      });
    });

    revalidatePath('/admin/archives');
    revalidatePath('/admin/classes');
    revalidatePath('/admin/emplois');
    revalidatePath('/admin/utilisateurs');
    revalidatePath('/admin/reinitialisation');

    return {
      succes: `Année ${anneeActuelle} archivée et réinitialisée avec succès.`,
    };
  } catch (error: any) {
    console.error('[REINITIALISATION] Erreur:', error);
    return {
      erreur: error.message || 'Erreur lors de la réinitialisation.',
    };
  }
}