
import { NextResponse } from 'next/server';

import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdminOrSuper } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { Role, Prisma } from '@prisma/client';

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

/**
 * Année scolaire courante.
 * Exemple : septembre 2026 à août 2027 = 2026-2027.
 */
function getAnneeScolaire(): string {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth() + 1;

  const debut = mois >= 9 ? annee : annee - 1;
  return `${debut}-${debut + 1}`;
}

/**
 * Génère un mot de passe simple à communiquer à l'utilisateur.
 */
function genererMotDePasse(nom: string, prenom: string): string {
  const nettoyer = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const identifiant = nettoyer(prenom).slice(0, 3) +
    nettoyer(nom).slice(0, 3);

  const suffixe = Math.random().toString(36).slice(2, 8);

  return `${identifiant || 'eleve'}${suffixe}`;
}

/**
 * Résout une classe :
 * - classe existante : récupère son identifiant ;
 * - identifiant synthétique new-niveau-section : crée la classe ;
 * - création déjà effectuée par une autre requête : récupère la classe créée.
 */
async function obtenirOuCreerClasse(
  tx: Prisma.TransactionClient,
  classeId: string | null | undefined
) {
  if (!classeId) return null;

  // Cas 1 : une vraie classe existe déjà.
  if (!classeId.startsWith('new-')) {
    const classe = await tx.classe.findUnique({
      where: { id: classeId },
    });

    if (!classe) {
      throw new Error('CLASSE_INTROUVABLE');
    }

    return classe;
  }

  // Cas 2 : identifiant synthétique envoyé par le formulaire.
  // Format : new-1ere_primaire-A
  const valeur = classeId.replace(/^new-/, '');
  const dernierTiret = valeur.lastIndexOf('-');

  if (dernierTiret === -1) {
    throw new Error('IDENTIFIANT_CLASSE_INVALIDE');
  }

  const niveau = valeur.substring(0, dernierTiret);
  const section = valeur.substring(dernierTiret + 1).toUpperCase();

  if (!NIVEAUX_LABELS[niveau] || !['A', 'B', 'C', 'D', 'E'].includes(section)) {
    throw new Error('NIVEAU_OU_SECTION_INVALIDE');
  }

  const nomClasse = `${NIVEAUX_LABELS[niveau]} ${section}`;
  const anneeScolaire = getAnneeScolaire();

  // Vérifier si la classe existe déjà pour cette année scolaire.
  const classeExistante = await tx.classe.findFirst({
    where: {
      nom: nomClasse,
      niveau,
      anneeScolaire,
    },
  });

  if (classeExistante) {
    return classeExistante;
  }

  // Créer automatiquement la classe.
  try {
    return await tx.classe.create({
      data: {
        nom: nomClasse,
        niveau,
        anneeScolaire,
      },
    });
  } catch (error: any) {
    // En cas de création simultanée, récupérer la classe créée.
    if (error?.code === 'P2002') {
      const classeRecuperee = await tx.classe.findFirst({
        where: {
          nom: nomClasse,
          niveau,
          anneeScolaire,
        },
      });

      if (classeRecuperee) return classeRecuperee;
    }

    throw error;
  }
}

// ======================================================
// GET : Récupérer les utilisateurs
// ======================================================

export const GET = withAdminOrSuper(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as Role | null;

  const db = await getPrismaDynamic();

  const filtreEmail =
    session.email === EMAIL_PROPRIETAIRE
      ? {}
      : { email: { not: EMAIL_PROPRIETAIRE } };

  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...filtreEmail,
    },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      actif: true,
      emailParent: true,
      createdAt: true,

      matieres: {
        select: {
          id: true,
          nom: true,
          coefficient: true,
        },
      },

      inscriptions: {
        include: {
          classe: true,
        },
        orderBy: {
          anneeScolaire: 'desc',
        },
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
                include: {
                  classe: true,
                },
                orderBy: {
                  anneeScolaire: 'desc',
                },
                take: 1,
              },
            },
          },
        },
      },
    },

    orderBy: [
      { role: 'asc' },
      { nom: 'asc' },
    ],
  });

  return NextResponse.json(users);
});

// ======================================================
// POST : Créer un utilisateur
// ======================================================

export const POST = withAdminOrSuper(async (req, session) => {
  try {
    const {
      email,
      motDePasse,
      nom,
      prenom,
      role,
      matiereIds,
      emailParent,
      classeId,
    } = await req.json();

    // ------------------------------------------
    // Vérification des autorisations
    // ------------------------------------------

    if (
      session.role === 'ADMIN' &&
      role !== 'ETUDIANT' &&
      role !== 'PARENT'
    ) {
      return NextResponse.json(
        {
          erreur:
            'Un administrateur ne peut créer que des élèves ou des parents.',
        },
        { status: 403 }
      );
    }

    // ------------------------------------------
    // Vérification des champs obligatoires
    // ------------------------------------------

    if (!email || !nom || !prenom || !role) {
      return NextResponse.json(
        { erreur: 'Champs requis manquants.' },
        { status: 400 }
      );
    }

    const emailNormalise = String(email).trim().toLowerCase();

    if (
      emailNormalise === EMAIL_PROPRIETAIRE.toLowerCase()
    ) {
      return NextResponse.json(
        { erreur: 'Cet email est réservé.' },
        { status: 403 }
      );
    }

    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { erreur: 'Rôle invalide.' },
        { status: 400 }
      );
    }

    const db = await getPrismaDynamic();

    // ------------------------------------------
    // Vérifier que l'email n'existe pas
    // ------------------------------------------

    const utilisateurExistant = await db.user.findUnique({
      where: {
        email: emailNormalise,
      },
      select: {
        id: true,
      },
    });

    if (utilisateurExistant) {
      return NextResponse.json(
        { erreur: 'Cette adresse email est déjà utilisée.' },
        { status: 409 }
      );
    }

    // ------------------------------------------
    // Générer le mot de passe si nécessaire
    // ------------------------------------------

    let motDePasseFinal = motDePasse;
    let motDePasseGenere: string | undefined;

    if (
      (role === 'ETUDIANT' || role === 'PARENT') &&
      !motDePasse
    ) {
      motDePasseGenere = genererMotDePasse(nom, prenom);
      motDePasseFinal = motDePasseGenere;
    }

    if (!motDePasseFinal) {
      return NextResponse.json(
        { erreur: 'Le mot de passe est obligatoire.' },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(motDePasseFinal, 10);

    // ------------------------------------------
    // Transaction : classe + utilisateur + inscription
    // ------------------------------------------

    const resultat = await db.$transaction(async (tx) => {
      let classe = null;

      // Création automatique ou récupération de la classe.
      if (role === 'ETUDIANT' && classeId) {
        classe = await obtenirOuCreerClasse(tx, classeId);
      }

      // Création de l'utilisateur.
      const user = await tx.user.create({
        data: {
          email: emailNormalise,
          motDePasse: hash,
          nom: String(nom).trim(),
          prenom: String(prenom).trim(),
          role: role as Role,
          actif: true,
          emailParent: emailParent || null,

          // Matières attribuées au professeur.
          ...(role === 'PROFESSEUR' &&
            Array.isArray(matiereIds) &&
            matiereIds.length > 0
            ? {
                matieres: {
                  connect: matiereIds.map((id: string) => ({
                    id,
                  })),
                },
              }
            : {}),

          // Inscription de l'élève dans sa classe.
          ...(role === 'ETUDIANT' && classe
            ? {
                inscriptions: {
                  create: {
                    classeId: classe.id,
                    anneeScolaire: classe.anneeScolaire,
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
          actif: true,
          emailParent: true,
          createdAt: true,
          matieres: {
            select: {
              id: true,
              nom: true,
              coefficient: true,
            },
          },
          inscriptions: {
            include: {
              classe: true,
            },
          },
        },
      });

      return {
        user,
        classe,
      };
    });

    // ------------------------------------------
    // Réponse
    // ------------------------------------------

    return NextResponse.json(
      {
        ...resultat.user,
        motDePasseGenere: motDePasseGenere || null,
        classeCreeeOuRecuperee: resultat.classe
          ? {
              id: resultat.classe.id,
              nom: resultat.classe.nom,
              niveau: resultat.classe.niveau,
              anneeScolaire: resultat.classe.anneeScolaire,
            }
          : null,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[API UTILISATEURS POST]', error);

    if (error?.message === 'CLASSE_INTROUVABLE') {
      return NextResponse.json(
        { erreur: 'La classe sélectionnée est introuvable.' },
        { status: 404 }
      );
    }

    if (
      error?.message === 'IDENTIFIANT_CLASSE_INVALIDE' ||
      error?.message === 'NIVEAU_OU_SECTION_INVALIDE'
    ) {
      return NextResponse.json(
        { erreur: 'Le niveau ou la section de la classe est invalide.' },
        { status: 400 }
      );
    }

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { erreur: 'Un utilisateur ou une classe avec ces informations existe déjà.' },
        { status: 409 }
      );
    }

    if (error?.code === 'P2003') {
      return NextResponse.json(
        { erreur: 'Une relation en base de données est invalide.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        erreur: 'Une erreur est survenue lors de la création de l’utilisateur.',
        details:
          process.env.NODE_ENV === 'development'
            ? error?.message
            : undefined,
      },
      { status: 500 }
    );
  }
});
