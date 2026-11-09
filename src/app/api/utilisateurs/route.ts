import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as Role | null;

  const db = await getPrismaDynamic();
  const users = await db.user.findMany({
    where: role ? { role } : {},
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

export const POST = withAdmin(async (req) => {
  const { email, motDePasse, nom, prenom, role, matiereIds, emailParent } = await req.json();

  if (!email || !nom || !prenom || !role) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  // ⭐ Mot de passe par défaut pour ÉLÈVE et PARENT
  let motDePasseFinal = motDePasse;
  if ((role === 'ETUDIANT' || role === 'PARENT') && !motDePasse) {
    // Nettoyer prénom et nom : retirer espaces, accents, caractères spéciaux
    const nettoyer = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // retire les accents
        .replace(/[^a-z0-9]/g, '');      // garde lettres et chiffres
    const prenomClean = nettoyer(prenom);
    const nomClean = nettoyer(nom);
    motDePasseFinal = `${prenomClean}-${nomClean}`;
  }

  if (!motDePasseFinal || motDePasseFinal.length < 6) {
    return NextResponse.json({ erreur: 'Mot de passe : 6 caractères minimum' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const hash = await bcrypt.hash(motDePasseFinal, 10);

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

  // ⭐ Retourner le mot de passe généré pour l'afficher à l'admin
  return NextResponse.json(
    {
      ...user,
      motDePasseGenere: (role === 'ETUDIANT' || role === 'PARENT') && !motDePasse ? motDePasseFinal : null,
    },
    { status: 201 }
  );
});