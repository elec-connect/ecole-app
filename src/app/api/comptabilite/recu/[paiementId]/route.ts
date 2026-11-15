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

  const paiement = await db.paiement.findUnique({
    where: { id: paiementId },
    include: {
      frais: {
        include: {
          eleve: { select: { nom: true, prenom: true, email: true } },
        },
      },
    },
  });

  if (!paiement) {
    return NextResponse.json({ erreur: 'Paiement introuvable' }, { status: 404 });
  }

  const doc = new jsPDF();
  const eleve = paiement.frais.eleve;

  // En-tête
  doc.setFontSize(18);
  doc.text(config.appName || 'ÉcoleApp', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(config.anneeScolaireCourante || '', 105, 28, { align: 'center' });

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(20, 33, 190, 33);

  // Titre
  doc.setFontSize(16);
  doc.text('REÇU DE PAIEMENT', 105, 50, { align: 'center' });

  // Infos
  doc.setFontSize(11);
  doc.text(`N° de reçu : ${paiement.id.slice(0, 12).toUpperCase()}`, 20, 70);
  doc.text(`Date : ${paiement.datePaiement.toLocaleDateString('fr-FR')}`, 20, 78);

  // Élève
  doc.setFontSize(12);
  doc.text('Élève :', 20, 95);
  doc.setFontSize(11);
  doc.text(`${eleve.prenom} ${eleve.nom}`, 20, 103);
  doc.text(`Email : ${eleve.email}`, 20, 111);

  // Détails
  doc.setFontSize(12);
  doc.text('Détails du paiement :', 20, 130);
  doc.setFontSize(11);
  doc.text(`Mois : ${MOIS_LABELS[paiement.mois] || paiement.mois}`, 20, 140);
  doc.text(`Montant : ${paiement.montant.toFixed(2)} DT`, 20, 148);
  if (paiement.methode) doc.text(`Méthode : ${paiement.methode}`, 20, 156);

  // Total encadré
  doc.setDrawColor(22, 163, 74);
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(20, 168, 170, 20, 3, 3, 'FD');
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text(`TOTAL : ${paiement.montant.toFixed(2)} DT`, 105, 181, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('Merci de votre confiance.', 105, 210, { align: 'center' });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recu-${eleve.nom}-${paiement.mois}.pdf"`,
    },
  });
}