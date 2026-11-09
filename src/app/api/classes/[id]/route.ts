import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin, withRoles } from '@/lib/api-helpers';

export const GET = withRoles(['ADMIN', 'PROFESSEUR'], async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();

  const classe = await db.classe.findUnique({
    where: { id },
    include: {
      professeurPrincipal: { select: { id: true, nom: true, prenom: true } },
      inscriptions: {
        include: {
          etudiant: {
            select: { id: true, nom: true, prenom: true, email: true, actif: true },
          },
        },
      },
      cours: {
        include: {
          matiere: true,
          professeur: { select: { id: true, nom: true, prenom: true } },
        },
      },
    },
  });

  if (!classe) {
    return NextResponse.json({ erreur: 'Classe introuvable' }, { status: 404 });
  }

  return NextResponse.json(classe);
});

export const PUT = withAdmin(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const db = await getPrismaDynamic();

  const classe = await db.classe.update({
    where: { id },
    data: {
      ...(body.nom && { nom: body.nom }),
      ...(body.niveau && { niveau: body.niveau }),
      ...(body.anneeScolaire && { anneeScolaire: body.anneeScolaire }),
      ...(body.professeurPrincipalId !== undefined && {
        professeurPrincipalId: body.professeurPrincipalId || null,
      }),
    },
  });

  return NextResponse.json(classe);
});

export const DELETE = withAdmin(async (_req, _session, ctx) => {
  const { id } = await ctx.params;
  const db = await getPrismaDynamic();
  await db.classe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});