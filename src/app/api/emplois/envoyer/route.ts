import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdminOrSuper } from '@/lib/api-helpers';
import { envoyerEmail, htmlEmploiDuTemps } from '@/lib/email';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const CRENEAUX = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
];

function genererPDFEmploi(cours: any[], mode: string, titre: string, anneeScolaire: string) {
  const grille: Record<string, Record<string, string>> = {};
  for (const cr of CRENEAUX) grille[cr] = {};

  for (const c of cours) {
    const key = `${c.heureDebut}-${c.heureFin}`;
    if (!grille[key]) grille[key] = {};
    const jourNom = JOURS[c.jourSemaine - 1] ?? '';
    grille[key][jourNom] = `${c.matiere.nom}\n${mode === 'eleve' ? c.professeur.prenom + ' ' + c.professeur.nom : c.classe.nom}${c.salle ? '\n🏫 ' + c.salle.nom : ''}`;
  }

  const pdf = new jsPDF('l', 'mm', 'a4');
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titre, 148, 15, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Année scolaire : ${anneeScolaire}`, 148, 22, { align: 'center' });

  const head = [['Horaire', ...JOURS]];
  const body: string[][] = [];
  for (const cr of CRENEAUX) {
    const ligne = [cr];
    for (const jour of JOURS) ligne.push(grille[cr]?.[jour] ?? '—');
    body.push(ligne);
  }

  autoTable(pdf, {
    startY: 28,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 40 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 },
      4: { cellWidth: 40 }, 5: { cellWidth: 40 }, 6: { cellWidth: 40 },
    },
  });

  return Buffer.from(pdf.output('arraybuffer'));
}

export const POST = withAdminOrSuper(async (req) => {
  const { mode, id, anneeScolaire } = await req.json();

  if (!mode || !id) {
    return NextResponse.json({ erreur: 'mode et id requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  let where: any = {};
  let titre = '';
  let destinataires: { email: string; nom: string }[] = [];

  if (mode === 'prof') {
    where.professeurId = id;
    const prof = await db.user.findUnique({ where: { id } });
    if (!prof) return NextResponse.json({ erreur: 'Prof introuvable' }, { status: 404 });
    titre = `Emploi du temps — ${prof.prenom} ${prof.nom}`;
    destinataires = [{ email: prof.email, nom: `${prof.prenom} ${prof.nom}` }];
  } else if (mode === 'eleve') {
    where.classeId = id;
    const classe = await db.classe.findUnique({
      where: { id },
      include: { inscriptions: { include: { etudiant: true } } },
    });
    if (!classe) return NextResponse.json({ erreur: 'Classe introuvable' }, { status: 404 });
    titre = `Emploi du temps — ${classe.nom}`;
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

  // Générer le PDF une seule fois
  const pdfBuffer = genererPDFEmploi(cours, mode, titre, anneeScolaire ?? '');

  // Envoyer à chaque destinataire
  const resultats: { email: string; ok: boolean; erreur?: string }[] = [];

  for (const dest of destinataires) {
    try {
      await envoyerEmail({
        to: dest.email,
        subject: titre,
        html: htmlEmploiDuTemps({
          destinataire: dest.nom,
          classeOuProf: mode === 'eleve' ? titre.replace('Emploi du temps — ', '') : 'votre classe',
          anneeScolaire: anneeScolaire ?? '',
        }),
        attachments: [
          {
            filename: `emploi-${mode}-${id}.pdf`,
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