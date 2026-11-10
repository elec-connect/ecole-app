import { getPrismaDynamic } from './prisma-dynamic';

export function mention(moyenne: number): { label: string; color: string } {
  if (moyenne >= 16) return { label: 'Très bien', color: 'text-green-700' };
  if (moyenne >= 14) return { label: 'Bien', color: 'text-green-600' };
  if (moyenne >= 12) return { label: 'Assez bien', color: 'text-blue-600' };
  if (moyenne >= 10) return { label: 'Passable', color: 'text-orange-600' };
  return { label: 'Insuffisant', color: 'text-red-600' };
}

export type BulletinData = {
  eleve: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  classe: {
    id: string;
    nom: string;
    niveau: string;
    anneeScolaire: string;
  } | null;
  matieres: {
    id: string;
    nom: string;
    coefficient: number;
    moyenne: number | null;
    nbNotes: number;
    appreciation: { label: string; color: string } | null;
    notes: {
      id: string;
      type: string;
      nomEvaluation: string;
      valeur: number;
      coefficient: number;
      date: Date;
      commentaire: string | null;
    }[];
  }[];
  moyenneGenerale: number | null;
  mention: { label: string; color: string } | null;
  rang: number;
  totalEleves: number;
  statsClasse: {
    moyenneClasse: number | null;
    meilleureMoyenne: number | null;
    plusBasseMoyenne: number | null;
  };
  absences: {
    total: number;
    absents: number;
    retards: number;
    justifies: number;
    detail: {
      date: Date;
      matiere: string;
      statut: string;
    }[];
  };
};

export async function calculerBulletin(etudiantId: string): Promise<BulletinData> {
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
    throw new Error('Élève introuvable');
  }

  const classe = eleve.inscriptions[0]?.classe;

  // ⭐ CAS : pas de classe → retourner un bulletin vide au lieu de planter
  if (!classe) {
    return {
      eleve: {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        email: eleve.email,
      },
      classe: null,
      matieres: [],
      moyenneGenerale: null,
      mention: null,
      rang: 0,
      totalEleves: 0,
      statsClasse: {
        moyenneClasse: null,
        meilleureMoyenne: null,
        plusBasseMoyenne: null,
      },
      absences: {
        total: 0,
        absents: 0,
        retards: 0,
        justifies: 0,
        detail: [],
      },
    };
  }

  // Coefficients par classe
  const volumes = await db.volumeHoraire.findMany({
    where: { classeId: classe.id },
  });
  const coefParMatiere: Record<string, number> = {};
  volumes.forEach((v) => {
    coefParMatiere[v.matiereId] = v.coefficient;
  });

  // Toutes les matières
  const matieres = await db.matiere.findMany({ orderBy: { nom: 'asc' } });

  // Notes de l'élève
  const notes = await db.note.findMany({
    where: { etudiantId },
    include: {
      matiere: true,
      evaluation: { include: { cours: true } },
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

  // Moyennes par matière
  const matieresData = matieres.map((m) => {
    const notesMat = notesParMatiere.get(m.id) ?? [];
    const coefMatiere = coefParMatiere[m.id] ?? m.coefficient;

    let moyenne: number | null = null;
    if (notesMat.length > 0) {
      const somme = notesMat.reduce(
        (a, n) => a + n.valeur * (n.evaluation?.coefficient ?? n.coefficient),
        0
      );
      const totalCoef = notesMat.reduce(
        (a, n) => a + (n.evaluation?.coefficient ?? n.coefficient),
        0
      );
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
  const moyenneGenerale =
    totalCoefs > 0 ? Math.round((sommePonderee / totalCoefs) * 100) / 100 : null;

  // Rang et stats de classe
  const inscriptionsClasse = await db.inscription.findMany({
    where: { classeId: classe.id },
    include: { etudiant: true },
  });

  const etudiantIds = inscriptionsClasse.map((i) => i.etudiantId);

  const toutesNotes = await db.note.findMany({
    where: { etudiantId: { in: etudiantIds } },
    include: { evaluation: true },
  });

  const moyennesEleves: { etudiantId: string; moyenne: number }[] = [];

  for (const id of etudiantIds) {
    const notesEleve = toutesNotes.filter((n) => n.etudiantId === id);
    if (notesEleve.length === 0) continue;

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

  moyennesEleves.sort((a, b) => b.moyenne - a.moyenne);

  const rang = moyennesEleves.findIndex((m) => m.etudiantId === etudiantId) + 1;
  const totalEleves = moyennesEleves.length;

  const moyenneClasse =
    totalEleves > 0
      ? Math.round((moyennesEleves.reduce((a, m) => a + m.moyenne, 0) / totalEleves) * 100) / 100
      : null;
  const meilleureMoyenne = totalEleves > 0 ? moyennesEleves[0].moyenne : null;
  const plusBasseMoyenne = totalEleves > 0 ? moyennesEleves[totalEleves - 1].moyenne : null;

  return {
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
  };
}

// Vérifie qu'un parent a bien accès à cet élève
export async function verifierAccesParent(
  parentId: string,
  eleveId: string
): Promise<boolean> {
  const db = await getPrismaDynamic();
  const lien = await db.parentEleve.findUnique({
    where: { parentId_eleveId: { parentId, eleveId } },
  });
  return !!lien;
}