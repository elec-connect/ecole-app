import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const POST = withAdmin(async (req) => {
  const { classeIds, archiverAvant } = await req.json();

  if (!Array.isArray(classeIds) || classeIds.length === 0) {
    return NextResponse.json({ erreur: 'Aucune classe sélectionnée' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  // Récupérer les infos avant suppression
  const classes = await db.classe.findMany({
    where: { id: { in: classeIds } },
    include: {
      _count: { select: { inscriptions: true, cours: true } },
    },
  });

  const anneeScolaire = classes[0]?.anneeScolaire ?? 'Inconnue';

  // Compter les données liées
  const nbNotes = await db.note.count({
    where: {
      etudiant: { inscriptions: { some: { classeId: { in: classeIds } } } },
    },
  });

  const nbPresences = await db.presence.count({
    where: { cours: { classeId: { in: classeIds } } },
  });

  const nbEvaluations = await db.evaluation.count({
    where: { cours: { classeId: { in: classeIds } } },
  });

  const nbDevoirs = await db.devoir.count({
    where: { cours: { classeId: { in: classeIds } } },
  });

  // ⭐ ARCHIVER AVANT SUPPRESSION (si demandé)
  let archiveId: string | null = null;
  let archiveStats: any = null;

  if (archiverAvant) {
    // Récupérer les élèves
    const inscriptions = await db.inscription.findMany({
      where: { classeId: { in: classeIds } },
      include: { etudiant: true, classe: true },
    });

    const etudiantIds = Array.from(new Set(inscriptions.map((i) => i.etudiantId)));

    // Récupérer les notes
    const notes = await db.note.findMany({
      where: { etudiantId: { in: etudiantIds } },
      include: {
        etudiant: true,
        matiere: true,
        evaluation: true,
      },
      orderBy: [{ date: 'asc' }],
    });

    // Récupérer les présences
    const presences = await db.presence.findMany({
      where: { etudiantId: { in: etudiantIds } },
      include: {
        etudiant: true,
        cours: { include: { matiere: true } },
      },
      orderBy: [{ date: 'asc' }],
    });

    const classeEleve = (etudiantId: string) =>
      inscriptions.find((i) => i.etudiantId === etudiantId);

    // Construire l'archive JSON
    const archive = {
      anneeScolaire,
      dateArchivage: new Date().toISOString(),
      motif: 'Suppression de classes',
      classes: classes.map((c) => ({
        id: c.id,
        nom: c.nom,
        niveau: c.niveau,
        nbEleves: c._count.inscriptions,
        nbCours: c._count.cours,
      })),
      eleves: inscriptions.map((i) => ({
        id: i.etudiant.id,
        nom: i.etudiant.nom,
        prenom: i.etudiant.prenom,
        email: i.etudiant.email,
        classe: i.classe.nom,
      })),
      notes: notes.map((n) => ({
        etudiant: `${n.etudiant.prenom} ${n.etudiant.nom}`,
        classe: classeEleve(n.etudiantId)?.classe?.nom ?? '',
        matiere: n.matiere.nom,
        evaluation: n.evaluation?.nom ?? n.type,
        valeur: n.valeur,
        coefficient: n.evaluation?.coefficient ?? n.coefficient,
        date: new Date(n.date).toISOString(),
        commentaire: n.commentaire,
      })),
      presences: presences.map((p) => ({
        etudiant: `${p.etudiant.prenom} ${p.etudiant.nom}`,
        classe: classeEleve(p.etudiantId)?.classe?.nom ?? '',
        matiere: p.cours.matiere.nom,
        date: new Date(p.date).toISOString(),
        statut: p.statut,
      })),
      stats: {
        nbClasses: classes.length,
        nbEleves: etudiantIds.length,
        nbNotes: notes.length,
        nbPresences: presences.length,
      },
    };

    const archiveCreee = await db.archive.create({
      data: {
        anneeScolaire,
        nom: `Archive avant suppression - ${anneeScolaire} - ${classes.length} classe(s)`,
        type: 'avant-suppression',
        format: 'json',
        contenu: JSON.stringify(archive, null, 2),
        nbClasses: classes.length,
        nbEleves: etudiantIds.length,
        nbNotes: notes.length,
      },
    });

    archiveId = archiveCreee.id;
    archiveStats = archive.stats;
  }

  // Supprimer les classes (cascade)
  const resultat = await db.classe.deleteMany({
    where: { id: { in: classeIds } },
  });

  return NextResponse.json({
    ok: true,
    nbSupprimees: resultat.count,
    archiveId,
    archiveStats,
    details: {
      classes: classes.map((c) => ({
        nom: c.nom,
        niveau: c.niveau,
        nbEleves: c._count.inscriptions,
        nbCours: c._count.cours,
      })),
      nbNotes,
      nbPresences,
      nbEvaluations,
      nbDevoirs,
    },
  });
});