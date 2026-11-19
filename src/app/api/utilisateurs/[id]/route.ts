import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { withSuperAdmin, withAdminOrSuper } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';

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

export const GET = withAdminOrSuper(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  
  const user = await db.user.findUnique({
    where: { id },
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
          eleve: { select: { id: true, nom: true, prenom: true, email: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });

  if (user.email === EMAIL_PROPRIETAIRE && session.email !== EMAIL_PROPRIETAIRE) {
    return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });
  }

  return NextResponse.json(user);
});

export const PUT = withAdminOrSuper(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();

  const cible = await db.user.findUnique({ where: { id } });
  if (!cible) {
    return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 });
  }

  if (cible.email === EMAIL_PROPRIETAIRE && session.email !== EMAIL_PROPRIETAIRE) {
    return NextResponse.json({ erreur: 'Action non autorisée sur ce compte.' }, { status: 403 });
  }

  if (session.role === 'ADMIN') {
    if (cible.role !== 'ETUDIANT' && cible.role !== 'PARENT') {
      return NextResponse.json(
        { erreur: 'Un administrateur ne peut éditer que les élèves ou les parents.' },
        { status: 403 }
      );
    }
    if (body.role && body.role !== cible.role) {
      return NextResponse.json(
        { erreur: 'Un administrateur ne peut pas modifier le rôle.' },
        { status: 403 }
      );
    }
  }

  const data: any = {
    ...(body.email && { email: body.email }),
    ...(body.nom && { nom: body.nom }),
    ...(body.prenom && { prenom: body.prenom }),
    ...(body.role && { role: body.role }),
    ...(body.actif !== undefined && { actif: body.actif }),
    ...(body.emailParent !== undefined && { emailParent: body.emailParent || null }),
  };

  if (body.motDePasse && body.motDePasse.length >= 6) {
    data.motDePasse = await bcrypt.hash(body.motDePasse, 10);
  }

  if (Array.isArray(body.matiereIds)) {
    data.matieres = { set: body.matiereIds.map((mid: string) => ({ id: mid })) };
  } else if (body.role && body.role !== 'PROFESSEUR') {
    data.matieres = { set: [] };
  }

  // ⭐ Gestion de la classe (création auto si nécessaire)
  if (body.classeId !== undefined && (body.role === 'ETUDIANT' || cible.role === 'ETUDIANT')) {
    let classeIdFinal = body.classeId;

    if (body.classeId && body.classeId.startsWith('new-')) {
      const parts = body.classeId.split('-');
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
      console.log(`[UTILISATEUR PUT] Classe créée automatiquement : ${nomClasse}`);
    }

    const user = await db.user.findUnique({ where: { id }, include: { inscriptions: true } });
    const inscriptionActuelle = user?.inscriptions[0];

    if (classeIdFinal === '' || classeIdFinal === null) {
      if (inscriptionActuelle) {
        await db.inscription.delete({ where: { id: inscriptionActuelle.id } });
      }
    } else if (inscriptionActuelle) {
      if (inscriptionActuelle.classeId !== classeIdFinal) {
        await db.inscription.update({
          where: { id: inscriptionActuelle.id },
          data: { classeId: classeIdFinal },
        });
      }
    } else {
      const classe = await db.classe.findUnique({ where: { id: classeIdFinal } });
      if (classe) {
        await db.inscription.create({
          data: { etudiantId: id, classeId: classeIdFinal, anneeScolaire: classe.anneeScolaire },
        });
      }
    }
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      actif: true,
      emailParent: true,
      matieres: { select: { id: true, nom: true } },
      inscriptions: { include: { classe: true } },
    },
  });

  return NextResponse.json(user);
});

export const DELETE = withSuperAdmin(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  
  if (id === session.id) {
    return NextResponse.json(
      { erreur: 'Impossible de supprimer votre propre compte' },
      { status: 400 }
    );
  }

  const db = await getPrismaDynamic();

  const cible = await db.user.findUnique({ where: { id } });
  if (!cible) {
    return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 });
  }

  if (cible.email === EMAIL_PROPRIETAIRE && session.email !== EMAIL_PROPRIETAIRE) {
    return NextResponse.json({ erreur: 'Impossible de supprimer ce compte.' }, { status: 403 });
  }

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    await db.user.update({ where: { id }, data: { actif: false } });
    return NextResponse.json({ ok: true, message: 'Compte désactivé (données liées)' });
  }
});