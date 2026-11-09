import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const classeId = searchParams.get('classeId');

  const db = await getPrismaDynamic();

  const etudiants = await db.user.findMany({
    where: {
      role: 'ETUDIANT',
      actif: true,
      ...(classeId ? { inscriptions: { some: { classeId } } } : {}),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      inscriptions: {
        include: { classe: true },
        orderBy: { anneeScolaire: 'desc' },
        take: 1,
      },
      notes: {
        include: { matiere: true, evaluation: true },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  const matieres = await db.matiere.findMany({ orderBy: { nom: 'asc' } });

  // Coefficients par classe
  const volumes = classeId
    ? await db.volumeHoraire.findMany({ where: { classeId } })
    : [];

  const coefParMatiere: Record<string, number> = {};
  for (const v of volumes) {
    coefParMatiere[v.matiereId] = v.coefficient;
  }

  const resultat = etudiants.map((et) => {
    const notesParMatiere = new Map<string, { valeurs: { valeur: number; coef: number }[] }>();

    for (const note of et.notes) {
      const key = note.matiereId;
      if (!notesParMatiere.has(key)) notesParMatiere.set(key, { valeurs: [] });
      const coef = note.evaluation?.coefficient ?? note.coefficient;
      notesParMatiere.get(key)!.valeurs.push({ valeur: note.valeur, coef });
    }

    const moyennesParMatiere: Record<string, { nom: string; coefficient: number; moyenne: number | null; nbNotes: number }> = {};

    for (const mat of matieres) {
      // ⭐ Coef par classe si défini, sinon coef global
      const coefEffectif = coefParMatiere[mat.id] ?? mat.coefficient;

      const data = notesParMatiere.get(mat.id);
      if (data && data.valeurs.length > 0) {
        const somme = data.valeurs.reduce((a, v) => a + v.valeur * v.coef, 0);
        const totalCoef = data.valeurs.reduce((a, v) => a + v.coef, 0);
        moyennesParMatiere[mat.id] = {
          nom: mat.nom,
          coefficient: coefEffectif,
          moyenne: totalCoef > 0 ? Math.round((somme / totalCoef) * 100) / 100 : null,
          nbNotes: data.valeurs.length,
        };
      } else {
        moyennesParMatiere[mat.id] = {
          nom: mat.nom,
          coefficient: coefEffectif,
          moyenne: null,
          nbNotes: 0,
        };
      }
    }

    let sommePonderee = 0;
    let totalCoefs = 0;
    for (const mat of matieres) {
      const mm = moyennesParMatiere[mat.id];
      if (mm.moyenne !== null) {
        sommePonderee += mm.moyenne * mm.coefficient;
        totalCoefs += mm.coefficient;
      }
    }
    const moyenneGenerale = totalCoefs > 0 ? Math.round((sommePonderee / totalCoefs) * 100) / 100 : null;

    return {
      id: et.id,
      nom: et.nom,
      prenom: et.prenom,
      email: et.email,
      classe: et.inscriptions[0]?.classe?.nom ?? '—',
      moyennesParMatiere,
      moyenneGenerale,
    };
  });

  return NextResponse.json({
    matieres: matieres.map((m) => ({ id: m.id, nom: m.nom, coefficient: m.coefficient })),
    etudiants: resultat,
  });
});