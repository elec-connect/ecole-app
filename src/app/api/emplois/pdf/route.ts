import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdminOrSuper } from '@/lib/api-helpers';
import { genererPDFEmploi } from '@/lib/emploi-pdf';
import { getConfig } from '@/lib/config';

export const POST = withAdminOrSuper(async (req) => {
  const { mode, id } = await req.json();

  if (!mode || !id) {
    return NextResponse.json({ erreur: 'mode et id requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const anneeScolaire = config?.anneeScolaireCourante ?? '';

  let where: any = {};
  let titre = '';

  if (mode === 'prof') {
    where.professeurId = id;
    const prof = await db.user.findUnique({ where: { id } });
    titre = `Emploi du temps - ${prof?.prenom} ${prof?.nom}`;
  } else if (mode === 'eleve') {
    where.classeId = id;
    const classe = await db.classe.findUnique({ where: { id } });
    titre = `Emploi du temps - ${classe?.nom}`;
  } else {
    return NextResponse.json({ erreur: 'mode invalide' }, { status: 400 });
  }

  const cours = await db.cours.findMany({
    where,
    include: { classe: true, matiere: true, professeur: true, salle: true },
    orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
  });

  const pdfBuffer = genererPDFEmploi({
    cours,
    mode,
    titre,
    anneeScolaire,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="emploi-${mode}-${id}.pdf"`,
    },
  });
});