import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdminOrSuper } from '@/lib/api-helpers';
import { envoyerEmail, htmlEmploiDuTemps } from '@/lib/email';
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
  let destinataires: { email: string; nom: string }[] = [];

  if (mode === 'prof') {
    where.professeurId = id;
    const prof = await db.user.findUnique({ where: { id } });
    if (!prof) return NextResponse.json({ erreur: 'Prof introuvable' }, { status: 404 });
    titre = `Emploi du temps - ${prof.prenom} ${prof.nom}`;
    destinataires = [{ email: prof.email, nom: `${prof.prenom} ${prof.nom}` }];
  } else if (mode === 'eleve') {
    where.classeId = id;
    const classe = await db.classe.findUnique({
      where: { id },
      include: { inscriptions: { include: { etudiant: true } } },
    });
    if (!classe) return NextResponse.json({ erreur: 'Classe introuvable' }, { status: 404 });
    titre = `Emploi du temps - ${classe.nom}`;
    destinataires = classe.inscriptions.map((i) => ({
      email: i.etudiant.email,
      nom: `${i.etudiant.prenom} ${i.etudiant.nom}`,
    }));
  } else {
    return NextResponse.json({ erreur: 'mode invalide' }, { status: 400 });
  }

  if (destinataires.length === 0) {
    return NextResponse.json({ erreur: 'Aucun destinataire' }, { status: 400 });
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

  const resultats: { email: string; ok: boolean; erreur?: string }[] = [];

  for (const dest of destinataires) {
    try {
      await envoyerEmail({
        to: dest.email,
        subject: titre,
        html: htmlEmploiDuTemps({
          destinataire: dest.nom,
          classeOuProf: titre.replace('Emploi du temps - ', ''),
          anneeScolaire,
        }),
        attachments: [
          {
            filename: `emploi-${mode}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
      resultats.push({ email: dest.email, ok: true });
    } catch (e: any) {
      resultats.push({ email: dest.email, ok: false, erreur: e.message });
    }
  }

  const succes = resultats.filter((r) => r.ok).length;
  const echecs = resultats.filter((r) => !r.ok).length;

  return NextResponse.json({
    ok: echecs === 0,
    succes,
    echecs,
    total: destinataires.length,
    details: resultats,
  });
});