import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('\n=== VOLUMES HORAIRES ===');
  const volumes = await p.volumeHoraire.findMany({
    include: { classe: true, matiere: true },
  });
  console.log('Total:', volumes.length);
  volumes.forEach((x) =>
    console.log('  ' + x.classe.nom + ' -> ' + x.matiere.nom + ' : ' + x.heures + 'h')
  );

  console.log('\n=== PROFESSEURS ===');
  const profs = await p.user.findMany({
    where: { role: 'PROFESSEUR' },
    include: { matieres: true },
  });
  console.log('Total:', profs.length);
  profs.forEach((x) =>
    console.log(
      '  ' + x.prenom + ' ' + x.nom + ' -> ' +
      (x.matieres.length > 0 ? x.matieres.map((m) => m.nom).join(', ') : 'AUCUNE MATIERE')
    )
  );

  console.log('\n=== SALLES ===');
  const salles = await p.salle.findMany({ include: { matieres: true } });
  console.log('Total:', salles.length);
  salles.forEach((x) =>
    console.log(
      '  ' + x.nom + ' -> ' +
      (x.matieres.length > 0 ? x.matieres.map((m) => m.nom).join(', ') : 'polyvalente')
    )
  );

  console.log('\n=== MATIERES ===');
  const matieres = await p.matiere.findMany();
  console.log('Total:', matieres.length);
  matieres.forEach((x) => console.log('  ' + x.nom + ' (coef ' + x.coefficient + ')'));

  console.log('\n=== COURS ===');
  const cours = await p.cours.findMany({
    include: { classe: true, matiere: true, professeur: true, salle: true },
  });
  console.log('Total:', cours.length);
  cours.forEach((x) =>
    console.log(
      '  ' + x.classe.nom + ' | ' + x.matiere.nom + ' | ' +
      x.professeur.prenom + ' ' + x.professeur.nom + ' | ' +
      'Jour ' + x.jourSemaine + ' ' + x.heureDebut + '-' + x.heureFin +
      ' | ' + (x.salle ? x.salle.nom : 'sans salle')
    )
  );

  console.log('\n=== CLASSES ===');
  const classes = await p.classe.findMany();
  console.log('Total:', classes.length);
  classes.forEach((x) => console.log('  ' + x.nom + ' (' + x.niveau + ')'));
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());