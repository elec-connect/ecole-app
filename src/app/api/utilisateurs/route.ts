import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { withSuperAdmin, withAdminOrSuper } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

const EMAIL_PROPRIETAIRE = 'haouala18@gmail.com';

const NIVEAUX_LABELS: Record<string, string> = {
  '1ere_primaire': '1ère primaire',
  '2eme_primaire': '2ème primaire',
  '3eme_primaire': '3ème primaire',
  '4eme_primaire': '4ème primaire',
  '5eme_primaire': '5ème primaire',
  '6eme_primaire': '6ème primaire',
  '7eme': '7ème',
  '8eme': '8ème',
  '9eme': '9ème',
  '1ere': '1ère',
  '2eme': '2ème',
  '3eme': '3ème',
  '4eme': '4ème',
};

export const GET = withAdminOrSuper(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as Role | null;

  // ⭐ Un ADMIN ne peut jamais lister explicitement les SUPER_ADMIN ni les ADMIN
  if (session.role === 'ADMIN' && (role === 'SUPER_ADMIN' || role === 'ADMIN')) {
    return NextResponse.json([]);
  }

  const db = await getPrismaDynamic();

  const where: any = {};

  // Filtre email propriétaire (inchangé)
  if (session.email !== EMAIL_PROPRIETAIRE) {
    where.email = { not: EMAIL_PROPRIETAIRE };
  }

  // Filtre rôle demandé
  if (role) {
    where.role = role;
  } else if (session.role === 'ADMIN') {
    // ⭐ Un ADMIN ne voit ni les SUPER_ADMIN ni les autres ADMIN
    where.role = { notIn: ['SUPER_ADMIN', 'ADMIN'] };
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      actif: true,
      emailParent: true,
      createdAt: true,
      matieres: { select: { id: true, nom: true, coefficient: true } },
      inscriptions: {
        include: { classe: true },
        orderBy: { anneeScolaire: 'desc' },
      },
      enfants: {
        include: {
          eleve: {
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
            },
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { nom: 'asc' }],
  });

  return NextResponse.json(users);
});

export const POST = withAdminOrSuper(async (req, session) => {
  const { email, motDePasse, nom, prenom, role, matiereIds, emailParent, classeId } = await req.json();

  if (session.role === 'ADMIN' && role !== 'ETUDIANT' && role !== 'PARENT') {
    return NextResponse.json({ erreur: 'Un administrateur ne peut créer que des élèves ou des parents.' }, { status: 403 });
  }

  if (!email || !nom || !prenom || !role) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  if (email.toLowerCase() === EMAIL_PROPRIETAIRE.toLowerCase()) {
    return NextResponse.json({ erreur: 'Cet email est réservé.' }, { status: 403 });
  }

  let motDePasseFinal = motDePasse;
  if ((role === 'ETUDIANT' || role === 'PARENT') && !motDePasse) {
    const nettoyer = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    motDePasseFinal = `${nettoyer(prenom)}-${nettoyer(nom)}`;
  }

  if (!motDePasseFinal || motDePasseFinal.length < 6) {
    return NextResponse.json({ erreur: 'Mot de passe : 6 caractères minimum' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const hash = await bcrypt.hash(motDePasseFinal, 10);

  // ⭐ Si la classe n'existe pas encore (ID commençant par "new-"), la créer
  let classeIdFinal = classeId;
  if (role === 'ETUDIANT' && classeId && classeId.startsWith('new-')) {
    const parts = classeId.split('-');
    const section = parts[parts.length - 1];
    const niveau = parts.slice(1, -1).join('-');
    const niveauLabel = NIVEAUX_LABELS[niveau] || niveau;
    const nomClasse = `${niveauLabel} ${section}`;

    const config = await getConfig();
    const anneeScolaire = config.anneeScolaireCourante;

    const nouvelleClasse = await db.classe.create({
      data: {
        nom: nomClasse,
        niveau,
        anneeScolaire: anneeScolaire!,
      },
    });
    classeIdFinal = nouvelleClasse.id;
    console.log(`[UTILISATEUR] Classe créée automatiquement : ${nomClasse}`);
  }

  const user = await db.user.create({
    data: {
      email,
      motDePasse: hash,
      nom,
      prenom,
      role,
      emailParent: role === 'ETUDIANT' ? (emailParent || null) : null,
      ...(role === 'PROFESSEUR' && Array.isArray(matiereIds) && matiereIds.length > 0
        ? { matieres: { connect: matiereIds.map((id: string) => ({ id })) } }
        : {}),
      ...(role === 'ETUDIANT' && classeIdFinal
        ? {
            inscriptions: {
              create: {
                classeId: classeIdFinal,
                anneeScolaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      emailParent: true,
      matieres: { select: { id: true, nom: true } },
    },
  });

  return NextResponse.json(
    {
      ...user,
      motDePasseGenere:
        (role === 'ETUDIANT' || role === 'PARENT') && !motDePasse ? motDePasseFinal : null,
    },
    { status: 201 }
  );
});