import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth } from '@/lib/api-helpers';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function mention(moyenne: number): string {
  if (moyenne >= 16) return 'Très bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

export const POST = withAuth(async (req, session) => {
  const { etudiantId, anneeScolaire } = await req.json();

  if (!etudiantId) {
    return NextResponse.json({ erreur: 'etudiantId requis' }, { status: 400 });
  }

  // Vérifier les droits
  if (session.role === 'ETUDIANT' && session.id !== etudiantId) {
    return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  const db = await getPrismaDynamic();

  if (session.role === 'PARENT') {
    const lien = await db.parentEleve.findUnique({
      where: { parentId_eleveId: { parentId: session.id, eleveId: etudiantId } },
    });
    if (!lien) return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  // Réutiliser la logique de /api/bulletin/complet
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { cookies } = await import('next/headers');
  const token = (await cookies()).get('session')?.value;

  const res = await fetch(`${baseUrl}/api/bulletin/complet?etudiantId=${etudiantId}`, {
    headers: { cookie: `session=${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ erreur: 'Erreur chargement bulletin' }, { status: 500 });
  }

  const data = await res.json();

  // Générer le PDF
  const pdf = new jsPDF('p', 'mm', 'a4');

  // En-tête
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BULLETIN SCOLAIRE', 105, 20, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Année scolaire : ${data.classe.anneeScolaire}`, 105, 28, { align: 'center' });

  // Infos élève
  pdf.setFontSize(10);
  pdf.text(`Élève : ${data.eleve.prenom} ${data.eleve.nom}`, 20, 40);
  pdf.text(`Classe : ${data.classe.nom} (${data.classe.niveau})`, 20, 46);
  pdf.text(`Rang : ${data.rang}ème / ${data.totalEleves}`, 20, 52);

  // Tableau des matières
  const lignes = data.matieres.map((m: any) => [
    m.nom,
    m.coefficient.toString(),
    m.nbNotes.toString(),
    m.moyenne !== null ? m.moyenne.toFixed(2) + '/20' : '—',
    m.appreciation?.label ?? '—',
  ]);

  autoTable(pdf, {
    startY: 60,
    head: [['Matière', 'Coef.', 'Notes', 'Moyenne', 'Appréciation']],
    body: lignes,
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
  });

  const finalY = (pdf as any).lastAutoTable.finalY + 10;

  // Moyenne générale
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Moyenne générale :', 20, finalY);
  pdf.setFontSize(16);
  pdf.setTextColor(
    data.moyenneGenerale >= 10 ? 22 : 220,
    data.moyenneGenerale >= 10 ? 163 : 38,
    data.moyenneGenerale >= 10 ? 74 : 38
  );
  pdf.text(`${data.moyenneGenerale?.toFixed(2) ?? '—'}/20`, 80, finalY);

  // Mention
  if (data.mention) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Mention : ${data.mention.label}`, 20, finalY + 10);
  }

  // Stats classe
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const statsY = finalY + 22;
  pdf.text('Statistiques de classe :', 20, statsY);
  pdf.setFontSize(9);
  pdf.text(`Moyenne : ${data.statsClasse.moyenneClasse?.toFixed(2) ?? '—'}/20`, 25, statsY + 6);
  pdf.text(`Meilleure : ${data.statsClasse.meilleureMoyenne?.toFixed(2) ?? '—'}/20`, 25, statsY + 12);
  pdf.text(`Plus basse : ${data.statsClasse.plusBasseMoyenne?.toFixed(2) ?? '—'}/20`, 25, statsY + 18);

  // Absences
  const absY = statsY + 30;
  pdf.setFontSize(10);
  pdf.text('Absences et retards :', 20, absY);
  pdf.setFontSize(9);
  pdf.text(`Absences : ${data.absences.absents}`, 25, absY + 6);
  pdf.text(`Retards : ${data.absences.retards}`, 25, absY + 12);
  pdf.text(`Justifiées : ${data.absences.justifies}`, 25, absY + 18);

  // Signatures
  const signY = 250;
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Signature du professeur principal', 30, signY);
  pdf.text('Cachet de l\'établissement', 130, signY);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(25, signY + 3, 100, signY + 3);
  pdf.line(125, signY + 3, 200, signY + 3);

  // Pied de page
  pdf.setFontSize(8);
  pdf.text(`Bulletin généré le ${new Date().toLocaleDateString('fr-FR')} - ÉcoleApp`, 105, 285, { align: 'center' });

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulletin-${data.eleve.nom}-${data.eleve.prenom}.pdf"`,
    },
  });
});