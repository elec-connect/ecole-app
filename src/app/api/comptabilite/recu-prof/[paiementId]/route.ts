import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { jsPDF } from 'jspdf';

const MOIS_LABELS: Record<string, string> = {
  SEPTEMBRE: 'Septembre', OCTOBRE: 'Octobre', NOVEMBRE: 'Novembre', DECEMBRE: 'Décembre',
  JANVIER: 'Janvier', FEVRIER: 'Février', MARS: 'Mars', AVRIL: 'Avril',
  MAI: 'Mai', JUIN: 'Juin', JUILLET: 'Juillet', AOUT: 'Août',
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ paiementId: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 });
  }

  const { paiementId } = await ctx.params;
  const db = await getPrismaDynamic();
  const config = await getConfig();

  const paie = await db.paieProfesseur.findUnique({
    where: { id: paiementId },
    include: {
      tarif: {
        include: { professeur: { select: { nom: true, prenom: true, email: true } } },
      },
    },
  });

  if (!paie) {
    return NextResponse.json({ erreur: 'Paie introuvable' }, { status: 404 });
  }

  const prof = paie.tarif.professeur;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(config.appName || 'ÉcoleApp', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(config.anneeScolaireCourante || '', 105, 28, { align: 'center' });

  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(20, 33, 190, 33);

  doc.setFontSize(16);
  doc.text('FICHE DE PAIE — PROFESSEUR', 105, 50, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`N° : ${paie.id.slice(0, 12).toUpperCase()}`, 20, 70);
  doc.text(`Date : ${paie.datePaiement.toLocaleDateString('fr-FR')}`, 20, 78);

  doc.setFontSize(12);
  doc.text('Professeur :', 20, 95);
  doc.setFontSize(11);
  doc.text(`${prof.prenom} ${prof.nom}`, 20, 103);
  doc.text(`Email : ${prof.email}`, 20, 111);

  doc.setFontSize(12);
  doc.text('Détails :', 20, 130);
  doc.setFontSize(11);
  doc.text(`Mois : ${MOIS_LABELS[paie.mois] || paie.mois}`, 20, 140);
  doc.text(`Heures travaillées : ${paie.heuresTravaillees} h`, 20, 148);
  doc.text(`Taux horaire : ${paie.tauxHoraire.toFixed(2)} DT/h`, 20, 156);

  doc.setDrawColor(22, 163, 74);
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(20, 168, 170, 20, 3, 3, 'FD');
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text(`MONTANT : ${paie.montant.toFixed(2)} DT`, 105, 181, { align: 'center' });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="paie-${prof.nom}-${paie.mois}.pdf"`,
    },
  });
}