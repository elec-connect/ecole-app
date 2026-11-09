import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, session, ctx) => {
  const { etudiantId } = await ctx.params;

  if (session.role === 'ETUDIANT' && session.id !== etudiantId) {
    return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  const db = await getPrismaDynamic();
  const notes = await db.note.findMany({
    where: { etudiantId },
    include: { matiere: true },
  });

  const parMatiere = new Map<
    string,
    { nom: string; coef: number; notes: typeof notes }
  >();

  for (const n of notes) {
    if (!parMatiere.has(n.matiereId)) {
      parMatiere.set(n.matiereId, {
        nom: n.matiere.nom,
        coef: n.matiere.coefficient,
        notes: [],
      });
    }
    parMatiere.get(n.matiereId)!.notes.push(n);
  }

  const matieres = Array.from(parMatiere.values()).map((m) => {
    const somme = m.notes.reduce((a, n) => a + n.valeur * n.coefficient, 0);
    const totalCoef = m.notes.reduce((a, n) => a + n.coefficient, 0);
    return {
      matiere: m.nom,
      coefficient: m.coef,
      moyenne: totalCoef > 0 ? Math.round((somme / totalCoef) * 100) / 100 : 0,
      nbNotes: m.notes.length,
    };
  });

  const totalPondere = matieres.reduce((a, m) => a + m.moyenne * m.coefficient, 0);
  const totalCoefs = matieres.reduce((a, m) => a + m.coefficient, 0);
  const moyenneGenerale = totalCoefs > 0 ? totalPondere / totalCoefs : 0;

  return NextResponse.json({
    matieres,
    moyenneGenerale: Math.round(moyenneGenerale * 100) / 100,
  });
});