import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const POST = withAdmin(async (req) => {
  const { anneeScolaire } = await req.json();

  if (!anneeScolaire) {
    return NextResponse.json({ erreur: 'anneeScolaire requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  // Récupérer toutes les classes de l'année
  const classes = await db.classe.findMany({
    where: { anneeScolaire },
    orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
  });

  if (classes.length === 0) {
    return NextResponse.json({ erreur: 'Aucune classe pour cette année' }, { status: 404 });
  }

  const classeIds = classes.map((c) => c.id);

  // Récupérer tous les élèves inscrits dans ces classes
  const inscriptions = await db.inscription.findMany({
    where: { classeId: { in: classeIds } },
    include: {
      etudiant: true,
      classe: true,
    },
  });

  const etudiantIds = Array.from(new Set(inscriptions.map((i) => i.etudiantId)));

  // Récupérer toutes les notes de ces élèves
  const notes = await db.note.findMany({
    where: { etudiantId: { in: etudiantIds } },
    include: {
      etudiant: true,
      matiere: true,
      evaluation: {
        include: { cours: true },
      },
    },
    orderBy: [{ date: 'asc' }],
  });

  // Récupérer toutes les présences de ces élèves
  const presences = await db.presence.findMany({
    where: { etudiantId: { in: etudiantIds } },
    include: {
      etudiant: true,
      cours: { include: { matiere: true } },
    },
    orderBy: [{ date: 'asc' }],
  });

  // Récupérer les coefficients par matière/classe
  const volumes = await db.volumeHoraire.findMany({
    where: { classeId: { in: classeIds } },
  });
  const coefMap = new Map<string, number>();
  volumes.forEach((v) => {
    coefMap.set(v.classeId + '|' + v.matiereId, v.coefficient);
  });

  // Trouver la classe d'un élève (première inscription)
  function classeEleve(etudiantId: string) {
    return inscriptions.find((i) => i.etudiantId === etudiantId);
  }

  // ============================================================
  // Génération du CSV
  // ============================================================
  const lignesCSV: string[] = [];

  // En-tête
  lignesCSV.push(
    [
      'Annee',
      'Classe',
      'Niveau',
      'Nom',
      'Prenom',
      'Email',
      'Matiere',
      'Evaluation',
      'Type',
      'Valeur',
      'Coefficient',
      'Date',
      'Commentaire',
    ]
      .map((h) => `"${h}"`)
      .join(';')
  );

  // Lignes notes
  for (const note of notes) {
    const insc = classeEleve(note.etudiantId);
    const classe = insc?.classe;
    const coefEval = note.evaluation?.coefficient ?? note.coefficient;

    lignesCSV.push(
      [
        anneeScolaire,
        classe?.nom ?? '',
        classe?.niveau ?? '',
        note.etudiant.nom,
        note.etudiant.prenom,
        note.etudiant.email,
        note.matiere.nom,
        note.evaluation?.nom ?? note.type,
        note.type,
        note.valeur.toString(),
        coefEval.toString(),
        new Date(note.date).toISOString().split('T')[0],
        (note.commentaire ?? '').replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(';')
    );
  }

  // Lignes présences (section séparée)
  lignesCSV.push('');
  lignesCSV.push('"=== PRESENCES ==="');
  lignesCSV.push(
    ['Annee', 'Classe', 'Nom', 'Prenom', 'Matiere', 'Date', 'Statut']
      .map((h) => `"${h}"`)
      .join(';')
  );

  for (const p of presences) {
    const insc = classeEleve(p.etudiantId);
    lignesCSV.push(
      [
        anneeScolaire,
        insc?.classe?.nom ?? '',
        p.etudiant.nom,
        p.etudiant.prenom,
        p.cours.matiere.nom,
        new Date(p.date).toISOString().split('T')[0],
        p.statut,
      ]
        .map((v) => `"${v}"`)
        .join(';')
    );
  }

  const contenuCSV = lignesCSV.join('\n');

  // ============================================================
  // Génération du JSON
  // ============================================================
  const archive = {
    anneeScolaire,
    dateExport: new Date().toISOString(),
    classes: classes.map((c) => ({
      id: c.id,
      nom: c.nom,
      niveau: c.niveau,
    })),
    eleves: inscriptions.map((i) => ({
      id: i.etudiant.id,
      nom: i.etudiant.nom,
      prenom: i.etudiant.prenom,
      email: i.etudiant.email,
      classe: i.classe.nom,
      niveau: i.classe.niveau,
    })),
    notes: notes.map((n) => {
      const insc = classeEleve(n.etudiantId);
      return {
        etudiantId: n.etudiantId,
        etudiant: `${n.etudiant.prenom} ${n.etudiant.nom}`,
        classe: insc?.classe?.nom ?? '',
        matiere: n.matiere.nom,
        evaluation: n.evaluation?.nom ?? n.type,
        type: n.type,
        valeur: n.valeur,
        coefficient: n.evaluation?.coefficient ?? n.coefficient,
        date: new Date(n.date).toISOString(),
        commentaire: n.commentaire,
      };
    }),
    presences: presences.map((p) => {
      const insc = classeEleve(p.etudiantId);
      return {
        etudiantId: p.etudiantId,
        etudiant: `${p.etudiant.prenom} ${p.etudiant.nom}`,
        classe: insc?.classe?.nom ?? '',
        matiere: p.cours.matiere.nom,
        date: new Date(p.date).toISOString(),
        statut: p.statut,
      };
    }),
    stats: {
      nbClasses: classes.length,
      nbEleves: etudiantIds.length,
      nbNotes: notes.length,
      nbPresences: presences.length,
    },
  };

  const contenuJSON = JSON.stringify(archive, null, 2);

  // ============================================================
  // Sauvegarder dans la table Archive
  // ============================================================
  const nomArchive = `Archive ${anneeScolaire} - ${classes.length} classe(s)`;

  const archiveSauvee = await db.archive.create({
    data: {
      anneeScolaire,
      nom: nomArchive,
      type: 'complet',
      format: 'json',
      contenu: contenuJSON,
      nbClasses: classes.length,
      nbEleves: etudiantIds.length,
      nbNotes: notes.length,
    },
  });

  return NextResponse.json({
    ok: true,
    archiveId: archiveSauvee.id,
    csv: contenuCSV,
    json: contenuJSON,
    stats: archive.stats,
    nomFichierCSV: `notes-${anneeScolaire.replace(/[^a-z0-9]/gi, '-')}.csv`,
    nomFichierJSON: `archive-${anneeScolaire.replace(/[^a-z0-9]/gi, '-')}.json`,
  });
});