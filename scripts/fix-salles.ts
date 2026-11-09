import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('🔧 Assignation des matières aux salles...\n');

  const matieres = await p.matiere.findMany();
  const salles = await p.salle.findMany();

  // Mapping salle -> matières
  const mapping: Record<string, string[]> = {
    'labo info1': ['Informatique'],
    'labo': ['Physique', 'Chimie', 'science et vie'],
    'atelier1': ['Technique'],
    'stade': ['Sport'],
    // salle1, salle2, salle3, salle4 restent polyvalentes
  };

  for (const salle of salles) {
    const matieresNoms = mapping[salle.nom] || [];
    const matiereIds = matieres
      .filter((m) => matieresNoms.includes(m.nom))
      .map((m) => ({ id: m.id }));

    if (matiereIds.length > 0) {
      await p.salle.update({
        where: { id: salle.id },
        data: { matieres: { set: matiereIds } },
      });
      console.log('✅ ' + salle.nom + ' -> ' + matieresNoms.join(', '));
    } else {
      // S'assurer que la salle est bien polyvalente (aucune matière)
      await p.salle.update({
        where: { id: salle.id },
        data: { matieres: { set: [] } },
      });
      console.log('✅ ' + salle.nom + ' -> POLYVALENTE');
    }
  }

  console.log('\n🎉 Salles configurées !');
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());