import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { calculerBulletin, verifierAccesParent } from '@/lib/bulletin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const POST = withAuth(async (req, session) => {
  const { etudiantId, anneeScolaire } = await req.json();

  if (!etudiantId) {
    return NextResponse.json({ erreur: 'etudiantId requis' }, { status: 400 });
  }

  if (session.role === 'ETUDIANT' && session.id !== etudiantId) {
    return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
  }

  if (session.role === 'PARENT') {
    const aAcces = await verifierAccesParent(session.id, etudiantId);
    if (!aAcces) {
      return NextResponse.json({ erreur: 'Interdit' }, { status: 403 });
    }
  }

  // Appel DIRECT (pas de fetch)
  const data = await calculerBulletin(etudiantId);

  // ⭐ Vérifier que l'élève a une classe
  if (!data.classe) {
    return NextResponse.json(
      {
        erreur:
          "Cet élève n'est inscrit dans aucune classe. Impossible de générer le bulletin.",
      },
      { status: 400 }
    );
  }

  // À partir d'ici, TypeScript sait que data.classe est non-null
  const classe = data.classe;

  // Générer le PDF
  const pdf = new jsPDF('p', 'mm', 'a4');

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BULLETIN SCOLAIRE', 105, 20, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Année scolaire : ${classe.anneeScolaire}`, 105, 28, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text(`Élève : ${data.eleve.prenom} ${data.eleve.nom}`, 20, 40);
  pdf.text(`Classe : ${classe.nom} (${classe.niveau})`, 20, 46);
  pdf.text(`Rang : ${data.rang}ème / ${data.totalEleves}`, 20, 52);

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

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Moyenne générale :', 20, finalY);
  pdf.setFontSize(16);
  pdf.setTextColor(
    data.moyenneGenerale !== null && data.moyenneGenerale >= 10 ? 22 : 220,
    data.moyenneGenerale !== null && data.moyenneGenerale >= 10 ? 163 : 38,
    data.moyenneGenerale !== null && data.moyenneGenerale >= 10 ? 74 : 38
  );
  pdf.text(`${data.moyenneGenerale?.toFixed(2) ?? '—'}/20`, 80, finalY);

  if (data.mention) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Mention : ${data.mention.label}`, 20, finalY + 10);
  }

  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const statsY = finalY + 22;
  pdf.text('Statistiques de classe :', 20, statsY);
  pdf.setFontSize(9);
  pdf.text(`Moyenne : ${data.statsClasse.moyenneClasse?.toFixed(2) ?? '—'}/20`, 25, statsY + 6);
  pdf.text(`Meilleure : ${data.statsClasse.meilleureMoyenne?.toFixed(2) ?? '—'}/20`, 25, statsY + 12);
  pdf.text(`Plus basse : ${data.statsClasse.plusBasseMoyenne?.toFixed(2) ?? '—'}/20`, 25, statsY + 18);

  const absY = statsY + 30;
  pdf.setFontSize(10);
  pdf.text('Absences et retards :', 20, absY);
  pdf.setFontSize(9);
  pdf.text(`Absences : ${data.absences.absents}`, 25, absY + 6);
  pdf.text(`Retards : ${data.absences.retards}`, 25, absY + 12);
  pdf.text(`Justifiées : ${data.absences.justifies}`, 25, absY + 18);

  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Bulletin généré le ${new Date().toLocaleDateString('fr-FR')} - ÉcoleApp`,
    105,
    285,
    { align: 'center' }
  );

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulletin-${data.eleve.nom}-${data.eleve.prenom}.pdf"`,
    },
  });
});