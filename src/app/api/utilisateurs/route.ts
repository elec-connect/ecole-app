import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withSuperAdmin, withAdminOrSuper } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

// GET : Admin et Super Admin
export const GET = withAdminOrSuper(async (req) => {
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

// POST : UNIQUEMENT Super Admin
export const POST = withAdminOrSuper(async (req, session) => {
  const { email, motDePasse, nom, prenom, role, matiereIds, emailParent, classeId } = await req.json();

  // ⭐ Sécurité : un ADMIN ne peut créer QUE des élèves ou des parents
  if (session.role === 'ADMIN' && role !== 'ETUDIANT' && role !== 'PARENT') {
    return NextResponse.json({ erreur: 'Un administrateur ne peut créer que des élèves ou des parents.' }, { status: 403 });
  }

  if (!email || !nom || !prenom || !role) {
    return NextResponse.json({ erreur: 'Champs requis manquants' }, { status: 400 });
  }

  // Mot de passe par défaut pour ÉLÈVE et PARENT
  let motDePasseFinal = motDePasse;
  if ((role === 'ETUDIANT' || role === 'PARENT') && !motDePasse) {
    const nettoyer = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    motDePasseFinal = `${nettoyer(prenom)}-${nettoyer(nom)}`;
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
      ...(role === 'ETUDIANT' && classeId
        ? {
            inscriptions: {
              create: {
                classeId,
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