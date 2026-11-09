import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

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

  const classe = await prisma.classe.upsert({
    where: { nom_anneeScolaire: { nom: '6ème A', anneeScolaire: '2025-2026' } },
    update: {},
    create: {
      nom: '6ème A',
      niveau: '6ème',
      anneeScolaire: '2025-2026',
      professeurPrincipalId: prof.id,
    },
  });

  const maths = await prisma.matiere.upsert({
    where: { nom: 'Mathématiques' },
    update: {},
    create: { nom: 'Mathématiques', coefficient: 4 },
  });

  for (let i = 1; i <= 5; i++) {
    const etu = await prisma.user.upsert({
      where: { email: `eleve${i}@ecole.tn` },
      update: {},
      create: {
        email: `eleve${i}@ecole.tn`,
        motDePasse: await hash('eleve123'),
        nom: `Nom${i}`,
        prenom: `Prénom${i}`,
        role: 'ETUDIANT',
      },
    });
    await prisma.inscription.upsert({
      where: {
        etudiantId_classeId_anneeScolaire: {
          etudiantId: etu.id,
          classeId: classe.id,
          anneeScolaire: '2025-2026',
        },
      },
      update: {},
      create: {
        etudiantId: etu.id,
        classeId: classe.id,
        anneeScolaire: '2025-2026',
      },
    });
  }

  console.log('✅ Seed terminé');
  console.log('   Prof : prof@ecole.tn / prof123');
  console.log('   Élève : eleve1@ecole.tn / eleve123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
