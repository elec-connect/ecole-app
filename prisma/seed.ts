import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ANNEE_SCOLAIRE = '2026-2027'; // ⭐ Année courante

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  console.log('🌱 Démarrage du seed...\n');

  // ============================================
  // 1. PROFESSEUR
  // ============================================
  const prof = await prisma.user.upsert({
    where: { email: 'prof@ecole.tn' },
    update: {},
    create: {
      email: 'prof@ecole.tn',
      motDePasse: await hash('prof123'),
      nom: 'Ben Ali',
      prenom: 'Ahmed',
      role: 'PROFESSEUR',
    },
  });
  console.log(`✅ Professeur : ${prof.email} / prof123`);

  // ============================================
  // 2. CLASSE
  // ============================================
  const classe = await prisma.classe.upsert({
    where: { nom_anneeScolaire: { nom: '6ème A', anneeScolaire: ANNEE_SCOLAIRE } },
    update: {},
    create: {
      nom: '6ème A',
      niveau: '6eme',
      anneeScolaire: ANNEE_SCOLAIRE,
      professeurPrincipalId: prof.id,
    },
  });
  console.log(`✅ Classe : ${classe.nom} (${classe.anneeScolaire})`);

  // ============================================
  // 3. MATIÈRE
  // ============================================
  const maths = await prisma.matiere.upsert({
    where: { nom: 'Mathématiques' },
    update: {},
    create: { nom: 'Mathématiques', coefficient: 4, heuresParSemaine: 4 },
  });
  console.log(`✅ Matière : ${maths.nom}`);

  // ============================================
  // 4. COURS (pour lier le prof à la classe)
  // ============================================
  const coursExistant = await prisma.cours.findFirst({
    where: {
      classeId: classe.id,
      professeurId: prof.id,
      matiereId: maths.id,
    },
  });

  if (!coursExistant) {
    await prisma.cours.create({
      data: {
        classeId: classe.id,
        professeurId: prof.id,
        matiereId: maths.id,
        jourSemaine: 1, // Lundi
        heureDebut: '08:00',
        heureFin: '09:00',
      },
    });
    console.log('✅ Cours créé (Lundi 08:00-09:00)');
  }

  // ============================================
  // 5. ÉLÈVES + PARENTS
  // ============================================
  for (let i = 1; i <= 5; i++) {
    // --- Élève ---
    const etu = await prisma.user.upsert({
      where: { email: `eleve${i}@ecole.tn` },
      update: {},
      create: {
        email: `eleve${i}@ecole.tn`,
        motDePasse: await hash('eleve123'),
        nom: `Nom${i}`,
        prenom: `Prénom${i}`,
        role: 'ETUDIANT',
        emailParent: `parent${i}@ecole.tn`, // ⭐ Lien email parent
      },
    });

    // --- Inscription ---
    await prisma.inscription.upsert({
      where: {
        etudiantId_classeId_anneeScolaire: {
          etudiantId: etu.id,
          classeId: classe.id,
          anneeScolaire: ANNEE_SCOLAIRE,
        },
      },
      update: {},
      create: {
        etudiantId: etu.id,
        classeId: classe.id,
        anneeScolaire: ANNEE_SCOLAIRE,
      },
    });

    // --- Parent ---
    const parent = await prisma.user.upsert({
      where: { email: `parent${i}@ecole.tn` },
      update: {},
      create: {
        email: `parent${i}@ecole.tn`,
        motDePasse: await hash('parent123'),
        nom: `Nom${i}`,
        prenom: `Parent${i}`,
        role: 'PARENT',
      },
    });

    // --- Lien ParentEleve ---
    await prisma.parentEleve.upsert({
      where: {
        parentId_eleveId: {
          parentId: parent.id,
          eleveId: etu.id,
        },
      },
      update: {},
      create: {
        parentId: parent.id,
        eleveId: etu.id,
        relation: 'parent',
      },
    });

    console.log(`✅ Élève ${i} : ${etu.email} / eleve123 + Parent : ${parent.email} / parent123`);
  }

  // ============================================
  // 6. FRAIS DE SCOLARITÉ (optionnel)
  // ============================================
  for (let i = 1; i <= 5; i++) {
    const etu = await prisma.user.findUnique({
      where: { email: `eleve${i}@ecole.tn` },
    });
    if (etu) {
      await prisma.fraisScolarite.upsert({
        where: {
          eleveId_anneeScolaire: {
            eleveId: etu.id,
            anneeScolaire: ANNEE_SCOLAIRE,
          },
        },
        update: {},
        create: {
          eleveId: etu.id,
          anneeScolaire: ANNEE_SCOLAIRE,
          montantMensuel: 150,
          description: 'Frais de scolarité annuels',
        },
      });
    }
  }
  console.log('✅ Frais de scolarité créés (150 DT/mois)');

  console.log('\n🎉 Seed terminé avec succès !\n');
  console.log('📋 Comptes créés :');
  console.log('   Prof     : prof@ecole.tn / prof123');
  console.log('   Élèves   : eleve1@ecole.tn à eleve5@ecole.tn / eleve123');
  console.log('   Parents  : parent1@ecole.tn à parent5@ecole.tn / parent123');
  console.log(`   Année    : ${ANNEE_SCOLAIRE}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());