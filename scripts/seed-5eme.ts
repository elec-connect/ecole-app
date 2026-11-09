import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('🚀 Création de 5ème S1...\n');

  // 1. Créer la classe
  let classe = await p.classe.findFirst({
    where: { nom: '5ème S1', anneeScolaire: '2025-2026' },
  });

  if (!classe) {
    classe = await p.classe.create({
      data: { nom: '5ème S1', niveau: '5ème', anneeScolaire: '2025-2026' },
    });
    console.log('✅ Classe créée:', classe.nom);
  } else {
    console.log('ℹ️  Classe existe déjà:', classe.nom);
  }

  // 2. Inscrire les élèves existants
  const etudiants = await p.user.findMany({ where: { role: 'ETUDIANT', actif: true } });
  let inscrits = 0;
  for (const e of etudiants) {
    const existant = await p.inscription.findFirst({
      where: { etudiantId: e.id, classeId: classe.id, anneeScolaire: '2025-2026' },
    });
    if (!existant) {
      await p.inscription.create({
        data: { etudiantId: e.id, classeId: classe.id, anneeScolaire: '2025-2026' },
      });
      inscrits++;
    }
  }
  console.log('✅ ' + inscrits + ' élève(s) inscrit(s) (' + etudiants.length + ' au total)');

  // 3. Volume horaire (même que 6ème A)
  const volumes: Record<string, number> = {
    'Mathématiques': 5,
    'Français': 4,
    'Arabe': 4,
    'Anglais': 3,
    'Physique': 3,
    'Chimie': 2,
    'science et vie': 2,
    'Histoire': 2,
    'Géographie': 2,
    'Éducation islamique': 2,
    'Sport': 2,
    'Informatique': 2,
  };

  let totalHeures = 0;
  for (const [nom, heures] of Object.entries(volumes)) {
    const mat = await p.matiere.findUnique({ where: { nom } });
    if (!mat) {
      console.log('⚠️  Matière introuvable:', nom);
      continue;
    }
    await p.volumeHoraire.upsert({
      where: { classeId_matiereId: { classeId: classe.id, matiereId: mat.id } },
      update: { heures },
      create: { classeId: classe.id, matiereId: mat.id, heures },
    });
    totalHeures += heures;
  }
  console.log('✅ Volume horaire configuré: ' + totalHeures + 'h/semaine');

  console.log('\n🎉 5ème S1 prête à générer !');
  console.log('   Allez sur /admin/emplois/generer et cochez les 2 classes');
}

main()
  .catch((e) => console.error('❌ ERREUR:', e))
  .finally(() => p.$disconnect());