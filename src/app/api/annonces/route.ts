import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withProf } from '@/lib/api-helpers';

// GET : lister les annonces (filtrées selon le rôle)
export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const classeId = searchParams.get('classeId');

  const db = await getPrismaDynamic();

  let filtre: any = {};

  if (session.role === 'PROFESSEUR') {
    // Le prof voit ses propres annonces
    filtre.professeurId = session.id;
  } else if (session.role === 'ETUDIANT') {
    // L'élève voit les annonces de sa classe
    const inscription = await db.inscription.findFirst({
      where: { etudiantId: session.id },
      orderBy: { anneeScolaire: 'desc' },
    });
    if (inscription) {
      filtre.classeId = inscription.classeId;
    } else {
      return NextResponse.json([]);
    }
  } else if (session.role === 'PARENT') {
    // Le parent voit les annonces des classes de ses enfants
    const liens = await db.parentEleve.findMany({
      where: { parentId: session.id },
      include: { eleve: { include: { inscriptions: true } } },
    });
    const classeIds = liens.flatMap((l) => l.eleve.inscriptions.map((i) => i.classeId));
    filtre.classeId = { in: classeIds };
  } else if (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') {
    // Admin voit tout
    if (classeId) filtre.classeId = classeId;
  }

  const annonces = await db.annonce.findMany({
    where: filtre,
    include: {
      classe: { select: { id: true, nom: true, niveau: true } },
      professeur: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(annonces);
});

// POST : créer une annonce (prof uniquement)
export const POST = withProf(async (req, session) => {
  const { titre, contenu, type, classeId, expireLe } = await req.json();

  if (!titre || !contenu || !classeId) {
    return NextResponse.json({ erreur: 'titre, contenu et classeId requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  // Vérifier que le prof enseigne bien dans cette classe
  const cours = await db.cours.findFirst({
    where: { professeurId: session.id, classeId },
  });

  if (!cours) {
    return NextResponse.json(
      { erreur: 'Vous n\'enseignez pas dans cette classe.' },
      { status: 403 }
    );
  }

  const annonce = await db.annonce.create({
    data: {
      titre,
      contenu,
      type: type || 'INFO',
      classeId,
      professeurId: session.id,
      expireLe: expireLe ? new Date(expireLe) : null,
    },
    include: {
      classe: { select: { nom: true } },
      professeur: { select: { nom: true, prenom: true } },
    },
  });

  return NextResponse.json(annonce, { status: 201 });
});