import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';

function mention(moyenne: number): { label: string; color: string } {
  if (moyenne >= 16) return { label: 'Très bien', color: 'text-green-700' };
  if (moyenne >= 14) return { label: 'Bien', color: 'text-green-600' };
  if (moyenne >= 12) return { label: 'Assez bien', color: 'text-blue-600' };
  if (moyenne >= 10) return { label: 'Passable', color: 'text-orange-600' };
  return { label: 'Insuffisant', color: 'text-red-600' };
}

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const etudiantId = searchParams.get('etudiantId') ?? session.id;

  // Vérifier les droits
  if (session.role === 'ETUDIANT' && session.id !== etudiantId) {
    return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  if (session.role === 'PARENT') {
    const lien = await (await getPrismaDynamic()).parentEleve.findUnique({
      where: { parentId_eleveId: { parentId: session.id, eleveId: etudiantId } },
    });
    if (!lien) {
      return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
    }
  }

  const db = await getPrismaDynamic();

  // Récupérer l'élève
  const eleve = await db.user.findUnique({
    where: { id: etudiantId },
    include: {
      inscriptions: {
        include: { classe: true },
        orderBy: { anneeScolaire: 'desc' },
        take: 1,
      },
    },
  });

  if (!eleve) {
    return NextResponse.json({ erreur: 'Élève introuvable' }, { status: 404 });
  }

  const classe = eleve.inscriptions[0]?.classe;
  if (!classe) {
    return NextResponse.json({ erreur: 'Aucune classe' }, { status: 404 });
  }

  // Coefficients par classe
  const volumes = await db.volumeHoraire.findMany({
    where: { classeId: classe.id },
  });
  const coefParMatiere: Record<string, number> = {};
  volumes.forEach((v) => { coefParMatiere[v.matiereId] = v.coefficient; });

  // Toutes les matières
  const matieres = await db.matiere.findMany({ orderBy: { nom: 'asc' } });

  // Notes de l'élève (avec évaluation et cours)
  const notes = await db.note.findMany({
    where: { etudiantId },
    include: {
      matiere: true,
      evaluation: {
        include: { cours: true },
      },
    },
    orderBy: [{ matiereId: 'asc' }, { date: 'asc' }],
  });

  // Absences
  const absences = await db.presence.findMany({
    where: { etudiantId, statut: { in: ['ABSENT', 'RETARD', 'JUSTIFIE'] } },
    include: { cours: { include: { matiere: true } } },
    orderBy: { date: 'desc' },
  });

  const nbAbsences = absences.filter((a) => a.statut === 'ABSENT').length;
  const nbRetards = absences.filter((a) => a.statut === 'RETARD').length;
  const nbJustifies = absences.filter((a) => a.statut === 'JUSTIFIE').length;

  // Grouper les notes par matière
  const notesParMatiere = new Map<string, typeof notes>();
  for (const n of notes) {
    if (!notesParMatiere.has(n.matiereId)) notesParMatiere.set(n.matiereId, []);
    notesParMatiere.get(n.matiereId)!.push(n);
  }

  // Construire les moyennes par matière
  const matieresData = matieres.map((m) => {
    const notesMat = notesParMatiere.get(m.id) ?? [];
    const coefMatiere = coefParMatiere[m.id] ?? m.coefficient;

    let moyenne: number | null = null;
    if (notesMat.length > 0) {
      const somme = notesMat.reduce((a, n) => a + n.valeur * (n.evaluation?.coefficient ?? n.coefficient), 0);
      const totalCoef = notesMat.reduce((a, n) => a + (n.evaluation?.coefficient ?? n.coefficient), 0);
      moyenne = totalCoef > 0 ? Math.round((somme / totalCoef) * 100) / 100 : null;
    }

    return {
      id: m.id,
      nom: m.nom,
      coefficient: coefMatiere,
      moyenne,
      nbNotes: notesMat.length,
      appreciation: moyenne !== null ? mention(moyenne) : null,
      notes: notesMat.map((n) => ({
        id: n.id,
        type: n.type,
        nomEvaluation: n.evaluation?.nom ?? n.type,
        valeur: n.valeur,
        coefficient: n.evaluation?.coefficient ?? n.coefficient,
        date: n.date,
        commentaire: n.commentaire,
      })),
    };
  });

  // Moyenne générale
  let sommePonderee = 0;
  let totalCoefs = 0;
  matieresData.forEach((m) => {
    if (m.moyenne !== null) {
      sommePonderee += m.moyenne * m.coefficient;
      totalCoefs += m.coefficient;
    }
  });
  const moyenneGenerale = totalCoefs > 0 ? Math.round((sommePonderee / totalCoefs) * 100) / 100 : null;

  // ============================================================
  // CALCUL DU RANG ET STATISTIQUES DE CLASSE
  // ============================================================
  const inscriptionsClasse = await db.inscription.findMany({
    where: { classeId: classe.id },
    include: { etudiant: true },
  });

  const etudiantIds = inscriptionsClasse.map((i) => i.etudiantId);

  // Récupérer toutes les notes de la classe
  const toutesNotes = await db.note.findMany({
    where: { etudiantId: { in: etudiantIds } },
    include: { evaluation: true },
  });

  // Calculer la moyenne générale de chaque élève
  const moyennesEleves: { etudiantId: string; moyenne: number }[] = [];

  for (const id of etudiantIds) {
    const notesEleve = toutesNotes.filter((n) => n.etudiantId === id);
    if (notesEleve.length === 0) continue;

    // Grouper par matière
    const parMatiere = new Map<string, { valeur: number; coef: number }[]>();
    for (const n of notesEleve) {
      if (!parMatiere.has(n.matiereId)) parMatiere.set(n.matiereId, []);
      parMatiere.get(n.matiereId)!.push({
        valeur: n.valeur,
        coef: n.evaluation?.coefficient ?? n.coefficient,
      });
    }

    let sommeP = 0;
    let totalC = 0;
    parMatiere.forEach((vals, matiereId) => {
      const somme = vals.reduce((a, v) => a + v.valeur * v.coef, 0);
      const totalCoef = vals.reduce((a, v) => a + v.coef, 0);
      if (totalCoef > 0) {
        const coefMat = coefParMatiere[matiereId] ?? 1;
        sommeP += (somme / totalCoef) * coefMat;
        totalC += coefMat;
      }
    });

    if (totalC > 0) {
      moyennesEleves.push({
        etudiantId: id,
        moyenne: Math.round((sommeP / totalC) * 100) / 100,
      });
    }
  }

  // Trier par moyenne décroissante
  moyennesEleves.sort((a, b) => b.moyenne - a.moyenne);

  // Trouver le rang de l'élève
  const rang = moyennesEleves.findIndex((m) => m.etudiantId === etudiantId) + 1;
  const totalEleves = moyennesEleves.length;

  const moyenneClasse = totalEleves > 0
    ? Math.round((moyennesEleves.reduce((a, m) => a + m.moyenne, 0) / totalEleves) * 100) / 100
    : null;
  const meilleureMoyenne = totalEleves > 0 ? moyennesEleves[0].moyenne : null;
  const plusBasseMoyenne = totalEleves > 0 ? moyennesEleves[totalEleves - 1].moyenne : null;

  return NextResponse.json({
    eleve: {
      id: eleve.id,
      nom: eleve.nom,
      prenom: eleve.prenom,
      email: eleve.email,
    },
    classe: {
      id: classe.id,
      nom: classe.nom,
      niveau: classe.niveau,
      anneeScolaire: classe.anneeScolaire,
    },
    matieres: matieresData,
    moyenneGenerale,
    mention: moyenneGenerale !== null ? mention(moyenneGenerale) : null,
    rang,
    totalEleves,
    statsClasse: {
      moyenneClasse,
      meilleureMoyenne,
      plusBasseMoyenne,
    },
    absences: {
      total: absences.length,
      absents: nbAbsences,
      retards: nbRetards,
      justifies: nbJustifies,
      detail: absences.slice(0, 10).map((a) => ({
        date: a.date,
        matiere: a.cours.matiere.nom,
        statut: a.statut,
      })),
    },
  });
});