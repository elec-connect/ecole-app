import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';

export const GET = withAdmin(async (_req, _session, ctx) => {
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
          eleve: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
            },
          },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 });
  return NextResponse.json(user);
});

export const PUT = withAdmin(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();

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

  // ⭐ Mettre à jour l'inscription si classeId fourni
  if (body.classeId !== undefined && body.role === 'ETUDIANT') {
    const user = await db.user.findUnique({ where: { id }, include: { inscriptions: true } });
    const inscriptionActuelle = user?.inscriptions[0];

    if (body.classeId === '' || body.classeId === null) {
      // Retirer l'élève de sa classe
      if (inscriptionActuelle) {
        await db.inscription.delete({ where: { id: inscriptionActuelle.id } });
      }
    } else if (inscriptionActuelle) {
      // Changer de classe
      if (inscriptionActuelle.classeId !== body.classeId) {
        await db.inscription.update({
          where: { id: inscriptionActuelle.id },
          data: { classeId: body.classeId },
        });
      }
    } else {
      // Créer une nouvelle inscription
      const classe = await db.classe.findUnique({ where: { id: body.classeId } });
      if (classe) {
        await db.inscription.create({
          data: {
            etudiantId: id,
            classeId: body.classeId,
            anneeScolaire: classe.anneeScolaire,
          },
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

export const DELETE = withAdmin(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  if (id === session.id) {
    return NextResponse.json({ erreur: 'Impossible de supprimer votre propre compte' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    await db.user.update({ where: { id }, data: { actif: false } });
    return NextResponse.json({ ok: true, message: 'Compte désactivé (données liées)' });
  }
});