import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withAuth } from '@/lib/api-helpers';

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const classeId = searchParams.get('classeId');
  const professeurId = searchParams.get('professeurId');

  const filtreProf = session.role === 'PROFESSEUR' ? { professeurId: session.id } : {};

  const db = await getPrismaDynamic();
  const cours = await db.cours.findMany({
    where: {
      ...filtreProf,
      ...(classeId && { classeId }),
      ...(professeurId && session.role === 'ADMIN' && { professeurId }),
    },
    include: {
      classe: true,
      matiere: true,
      professeur: { select: { id: true, nom: true, prenom: true, email: true } },
      salle: { select: { id: true, nom: true, type: true } },
      _count: { select: { presences: true, devoirs: true, evaluations: true } },
    },
    orderBy: [
      { jourSemaine: 'asc' },
      { heureDebut: 'asc' },
    ],
  });

  return NextResponse.json(cours);
});

export const POST = withAdmin(async (req) => {
  const { classeId, matiereId, professeurId, jourSemaine, heureDebut, heureFin, salleId } = await req.json();

  if (!classeId || !matiereId || !professeurId || jourSemaine === undefined || !heureDebut || !heureFin) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  // ============================================================
  // VÉRIFICATION DES CONFLITS
  // ============================================================

  // Récupérer tous les cours du même jour avec les infos nécessaires
  const coursDuJour = await db.cours.findMany({
    where: { jourSemaine },
    include: {
      classe: { select: { nom: true } },
      professeur: { select: { nom: true, prenom: true } },
      salle: { select: { nom: true } },
      matiere: { select: { nom: true } },
    },
  });

  // Fonction pour tester le chevauchement horaire
  const chevauche = (c: { heureDebut: string; heureFin: string }) =>
    heureDebut < c.heureFin && c.heureDebut < heureFin;

  // 1. Conflit de CLASSE
  const conflitClasse = coursDuJour.find((c) => c.classeId === classeId && chevauche(c));
  if (conflitClasse) {
    return NextResponse.json({
      erreur: `Conflit : la classe ${conflitClasse.classe.nom} a déjà cours de ${conflitClasse.matiere.nom} de ${conflitClasse.heureDebut} à ${conflitClasse.heureFin}.`,
    }, { status: 409 });
  }

  // 2. Conflit de PROFESSEUR
  const conflitProf = coursDuJour.find((c) => c.professeurId === professeurId && chevauche(c));
  if (conflitProf) {
    return NextResponse.json({
      erreur: `Conflit : le professeur ${conflitProf.professeur.prenom} ${conflitProf.professeur.nom} a déjà cours avec la classe ${conflitProf.classe.nom} de ${conflitProf.heureDebut} à ${conflitProf.heureFin}.`,
    }, { status: 409 });
  }

  // 3. Conflit de SALLE (si une salle est spécifiée)
  if (salleId) {
    const conflitSalle = coursDuJour.find((c) => c.salleId === salleId && chevauche(c));
    if (conflitSalle) {
      return NextResponse.json({
        erreur: `Conflit : la salle ${conflitSalle.salle?.nom} est déjà occupée par la classe ${conflitSalle.classe.nom} de ${conflitSalle.heureDebut} à ${conflitSalle.heureFin}.`,
      }, { status: 409 });
    }
  }

  // ============================================================
  // SI AUCUN CONFLIT, CRÉER LE COURS
  // ============================================================
  try {
    const cours = await db.cours.create({
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

    return NextResponse.json(cours, { status: 201 });
  } catch (error: any) {
    console.error('[COURS] Erreur création:', error);
    return NextResponse.json(
      { erreur: error.message || 'Erreur lors de la création du cours' },
      { status: 500 }
    );
  }
});