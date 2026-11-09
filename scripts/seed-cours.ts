import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const prof = await prisma.user.findFirst({ where: { role: 'PROFESSEUR' } });
  const classe = await prisma.classe.findFirst();
  const matiere = await prisma.matiere.findFirst();

  if (!prof || !classe || !matiere) {
    console.log('❌ Prof, classe ou matière manquant');
    console.log('   prof:', prof?.email, '| classe:', classe?.nom, '| matiere:', matiere?.nom);
    return;
  }

  const existant = await prisma.cours.findFirst({
    where: { professeurId: prof.id, classeId: classe.id, matiereId: matiere.id },
  });
  if (existant) {
    console.log('✅ Cours déjà existant :', existant.id);
    return;
  }

  const cours = await prisma.cours.create({
    data: {
      classeId: classe.id,
      matiereId: matiere.id,
      professeurId: prof.id,
      jourSemaine: 1,
      heureDebut: '08:00',
      heureFin: '09:00',
    },
  });
  console.log('✅ Cours créé :', cours.id);
  console.log('   ', matiere.nom, '—', classe.nom, '—', prof.prenom, prof.nom);
}
main().finally(() => prisma.$disconnect());