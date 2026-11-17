import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  const cours = await db.cours.findUnique({
    where: { id },
    include: {
      classe: true,
      matiere: true,
      professeur: { select: { id: true, nom: true, prenom: true, email: true } },
      devoirs: { orderBy: { deadline: 'desc' } },
      evaluations: { include: { notes: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!cours) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });
  return NextResponse.json(cours);
});

export const PUT = withAdmin(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();

  // 1. Récupérer le cours actuel pour connaître les valeurs non modifiées
  const coursActuel = await db.cours.findUnique({ where: { id } });
  if (!coursActuel) {
    return NextResponse.json({ erreur: 'Cours introuvable' }, { status: 404 });
  }

  // 2. Construire les nouvelles valeurs (en gardant celles non modifiées)
  const classeId = body.classeId ?? coursActuel.classeId;
  const professeurId = body.professeurId ?? coursActuel.professeurId;
  const jourSemaine = body.jourSemaine !== undefined ? body.jourSemaine : coursActuel.jourSemaine;
  const heureDebut = body.heureDebut ?? coursActuel.heureDebut;
  const heureFin = body.heureFin ?? coursActuel.heureFin;
  const salleId = body.salleId !== undefined ? body.salleId : coursActuel.salleId;
  const matiereId = body.matiereId ?? coursActuel.matiereId;

  // 3. VÉRIFICATION DES CONFLITS (en excluant le cours en cours de modification)
  const coursDuJour = await db.cours.findMany({
    where: { jourSemaine, id: { not: id } }, // ⭐ On exclut le cours actuel
    include: {
      classe: { select: { nom: true } },
      professeur: { select: { nom: true, prenom: true } },
      salle: { select: { nom: true } },
      matiere: { select: { nom: true } },
    },
  });

  const chevauche = (c: { heureDebut: string; heureFin: string }) =>
    heureDebut < c.heureFin && c.heureDebut < heureFin;

  // a) Conflit de CLASSE
  const conflitClasse = coursDuJour.find((c) => c.classeId === classeId && chevauche(c));
  if (conflitClasse) {
    return NextResponse.json({
      erreur: `Conflit : la classe ${conflitClasse.classe.nom} a déjà cours de ${conflitClasse.matiere.nom} de ${conflitClasse.heureDebut} à ${conflitClasse.heureFin}.`,
    }, { status: 409 });
  }

  // b) Conflit de PROFESSEUR
  const conflitProf = coursDuJour.find((c) => c.professeurId === professeurId && chevauche(c));
  if (conflitProf) {
    return NextResponse.json({
      erreur: `Conflit : le professeur ${conflitProf.professeur.prenom} ${conflitProf.professeur.nom} a déjà cours avec la classe ${conflitProf.classe.nom} de ${conflitProf.heureDebut} à ${conflitProf.heureFin}.`,
    }, { status: 409 });
  }

  // c) Conflit de SALLE
  if (salleId) {
    const conflitSalle = coursDuJour.find((c) => c.salleId === salleId && chevauche(c));
    if (conflitSalle) {
      return NextResponse.json({
        erreur: `Conflit : la salle ${conflitSalle.salle?.nom} est déjà occupée par la classe ${conflitSalle.classe.nom} de ${conflitSalle.heureDebut} à ${conflitSalle.heureFin}.`,
      }, { status: 409 });
    }
  }

  // 4. Mise à jour du cours
  try {
    const cours = await db.cours.update({
      where: { id },
      data: {
        classeId,
        matiereId,
        professeurId,
        jourSemaine,
        heureDebut,
        heureFin,
        salleId: salleId || null,
      },
    });

    return NextResponse.json(cours);
  } catch (error: any) {
    console.error('[COURS PUT] Erreur:', error);
    return NextResponse.json(
      { erreur: error.message || 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdmin(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.cours.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});