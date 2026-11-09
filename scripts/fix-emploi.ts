import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('🔧 Correction de la base...\n');

  // ============================================================
  // 1. Assigner les matières à chaque prof
  // ============================================================
  const profs = await p.user.findMany({ where: { role: 'PROFESSEUR' } });
  const matieres = await p.matiere.findMany();

  // Mapping prof -> matières par nom
  const mapping: Record<string, string[]> = {
    'Ahmed Ben Ali': ['Mathématiques', 'Informatique', 'Technique'],
    'adem ben haouala': ['science et vie', 'Physique', 'Chimie'],
    'mejri houda': ['Français', 'Anglais', 'Philosophie'],
    'Sahnoun BEN HAOUALA': ['Éducation islamique', 'Arabe', 'Histoire', 'Géographie'],
  };

  for (const prof of profs) {
    const nomComplet = prof.prenom + ' ' + prof.nom;
    const matieresNoms = mapping[nomComplet] || [];
    const matiereIds = matieres
      .filter((m) => matieresNoms.includes(m.nom))
      .map((m) => ({ id: m.id }));

    if (matiereIds.length > 0) {
      await p.user.update({
        where: { id: prof.id },
        data: { matieres: { set: matiereIds } },
      });
      console.log('✅ ' + nomComplet + ' -> ' + matieresNoms.join(', '));
    } else {
      console.log('⚠️  ' + nomComplet + ' : aucune matière assignée');
    }
  }

  // ============================================================
  // 2. Créer un prof "Sport" si nécessaire
  // ============================================================
  const sportMatiere = matieres.find((m) => m.nom === 'Sport');
  if (sportMatiere) {
    const profSport = await p.user.findFirst({
      where: { role: 'PROFESSEUR', matieres: { some: { id: sportMatiere.id } } },
    });
    if (!profSport) {
      // Assigner Sport à Sahnoun pour l'instant
      const sahnoun = profs.find((x) => x.nom === 'BEN HAOUALA' && x.prenom === 'Sahnoun');
      if (sahnoun) {
        await p.user.update({
          where: { id: sahnoun.id },
          data: { matieres: { connect: { id: sportMatiere.id } } },
        });
        console.log('✅ Sport assigné à Sahnoun BEN HAOUALA');
      }
    }
  }

  // ============================================================
  // 3. Réduire les volumes horaires à un total réaliste (~33h)
  // ============================================================
  const classe = await p.classe.findFirst();
  if (!classe) {
    console.log('❌ Aucune classe trouvée');
    return;
  }

  const volumesRealistes: Record<string, number> = {
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
    'Philosophie': 0,
    'Technique': 0,
  };

  let totalHeures = 0;
  for (const mat of matieres) {
    const heures = volumesRealistes[mat.nom] ?? 2;

    if (heures > 0) {
      await p.volumeHoraire.upsert({
        where: { classeId_matiereId: { classeId: classe.id, matiereId: mat.id } },
        update: { heures },
        create: { classeId: classe.id, matiereId: mat.id, heures },
      });
      totalHeures += heures;
    } else {
      // Supprimer le volume si heures = 0
      await p.volumeHoraire.deleteMany({
        where: { classeId: classe.id, matiereId: mat.id },
      });
    }
  }

  console.log('\n✅ Volumes horaires mis à jour : total ' + totalHeures + 'h/semaine');

  // ============================================================
  // 4. Résumé
  // ============================================================
  console.log('\n=== RÉSUMÉ ===');
  const profsFinaux = await p.user.findMany({
    where: { role: 'PROFESSEUR' },
    include: { matieres: true },
  });
  profsFinaux.forEach((x) =>
    console.log(
      '  ' + x.prenom + ' ' + x.nom + ' -> ' +
      (x.matieres.length > 0 ? x.matieres.map((m) => m.nom).join(', ') : 'AUCUNE')
    )
  );

  const matieresSansProf = matieres.filter(
    (m) => !profsFinaux.some((prof) => prof.matieres.some((pm) => pm.id === m.id))
  );
  if (matieresSansProf.length > 0) {
    console.log('\n⚠️  Matières sans prof :');
    matieresSansProf.forEach((m) => console.log('  - ' + m.nom));
  } else {
    console.log('\n✅ Toutes les matières ont un prof');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());