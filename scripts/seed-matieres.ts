import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MATIERES = [
  { nom: 'Mathématiques', coefficient: 4 },
  { nom: 'Physique', coefficient: 3 },
  { nom: 'Chimie', coefficient: 2 },
  { nom: 'Technique', coefficient: 2 },
  { nom: 'Français', coefficient: 3 },
  { nom: 'Anglais', coefficient: 2 },
  { nom: 'Arabe', coefficient: 3 },
  { nom: 'Histoire', coefficient: 2 },
  { nom: 'Géographie', coefficient: 2 },
  { nom: 'Éducation islamique', coefficient: 2 },
  { nom: 'Sport', coefficient: 1 },
  { nom: 'Informatique', coefficient: 2 },
  { nom: 'Philosophie', coefficient: 2 },
];

async function main() {
  for (const m of MATIERES) {
    const existante = await prisma.matiere.findUnique({ where: { nom: m.nom } });
    if (existante) {
      await prisma.matiere.update({
        where: { nom: m.nom },
        data: { coefficient: m.coefficient },
      });
      console.log('🔄 Mise à jour:', m.nom, '(coef', m.coefficient + ')');
    } else {
      await prisma.matiere.create({ data: m });
      console.log('✅ Créée:', m.nom, '(coef', m.coefficient + ')');
    }
  }
  console.log('\n🎉 Matières configurées !');
}

main().finally(() => prisma.$disconnect());