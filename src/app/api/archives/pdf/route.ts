import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const POST = withAdmin(async (req) => {
  const { anneeScolaire } = await req.json();
  if (!anneeScolaire) {
    return NextResponse.json({ erreur: 'anneeScolaire requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  const classes = await db.classe.findMany({
    where: { anneeScolaire },
    orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
  });

  if (classes.length === 0) {
    return NextResponse.json({ erreur: 'Aucune classe pour cette année' }, { status: 404 });
  }

  const classeIds = classes.map((c) => c.id);

  // Coefficients par classe
  const volumes = await db.volumeHoraire.findMany({
    where: { classeId: { in: classeIds } },
  });
  const coefMap = new Map<string, number>();
  volumes.forEach((v) => {
    coefMap.set(v.classeId + '|' + v.matiereId, v.coefficient);
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  let premierePage = true;

  for (const classe of classes) {
    const inscriptions = await db.inscription.findMany({
      where: { classeId: classe.id },
      include: { etudiant: true },
    });

    const etudiantIds = inscriptions.map((i) => i.etudiantId);

    const notes = await db.note.findMany({
      where: { etudiantId: { in: etudiantIds } },
      include: { matiere: true, evaluation: true },
    });

    for (const insc of inscriptions) {
      const etudiant = insc.etudiant;
      const notesEtudiant = notes.filter((n) => n.etudiantId === etudiant.id);

      // Grouper par matière
      const parMatiere = new Map<string, { nom: string; coefMatiere: number; notes: typeof notes }>();
      for (const n of notesEtudiant) {
        if (!parMatiere.has(n.matiereId)) {
          parMatiere.set(n.matiereId, {
            nom: n.matiere.nom,
            coefMatiere: coefMap.get(classe.id + '|' + n.matiereId) ?? n.matiere.coefficient,
            notes: [],
          });
        }
        parMatiere.get(n.matiereId)!.notes.push(n);
      }

      const lignes: any[] = [];
      let sommePonderee = 0;
      let totalCoef = 0;

      parMatiere.forEach((m) => {
        const somme = m.notes.reduce((a, n) => a + n.valeur * (n.evaluation?.coefficient ?? n.coefficient), 0);
        const totalNotesCoef = m.notes.reduce((a, n) => a + (n.evaluation?.coefficient ?? n.coefficient), 0);
        const moyenne = totalNotesCoef > 0 ? somme / totalNotesCoef : 0;

        lignes.push([
          m.nom,
          m.coefMatiere.toString(),
          m.notes.length.toString(),
          moyenne.toFixed(2) + '/20',
        ]);

        sommePonderee += moyenne * m.coefMatiere;
        totalCoef += m.coefMatiere;
      });

      const moyenneGenerale = totalCoef > 0 ? sommePonderee / totalCoef : 0;

      if (!premierePage) pdf.addPage();
      premierePage = false;

      // En-tête
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BULLETIN SCOLAIRE', 105, 20, { align: 'center' });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Année scolaire : ${anneeScolaire}`, 105, 28, { align: 'center' });
      pdf.text(`Classe : ${classe.nom} (${classe.niveau})`, 105, 34, { align: 'center' });

      // Infos élève
      pdf.setFontSize(10);
      pdf.text(`Élève : ${etudiant.prenom} ${etudiant.nom}`, 20, 45);
      pdf.text(`Email : ${etudiant.email}`, 20, 51);

      // Tableau des notes
      autoTable(pdf, {
        startY: 58,
        head: [['Matière', 'Coef.', 'Nb notes', 'Moyenne']],
        body: lignes,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center', fontStyle: 'bold' },
        },
      });

      // Moyenne générale
      const finalY = (pdf as any).lastAutoTable.finalY + 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Moyenne générale :', 20, finalY);
      pdf.setFontSize(16);
      pdf.setTextColor(moyenneGenerale >= 10 ? 22 : 220, moyenneGenerale >= 10 ? 163 : 38, moyenneGenerale >= 10 ? 74 : 38);
      pdf.text(`${moyenneGenerale.toFixed(2)}/20`, 80, finalY);

      // Mention
      let mention = 'Insuffisant';
      if (moyenneGenerale >= 16) mention = 'Très bien';
      else if (moyenneGenerale >= 14) mention = 'Bien';
      else if (moyenneGenerale >= 12) mention = 'Assez bien';
      else if (moyenneGenerale >= 10) mention = 'Passable';

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.text(`Mention : ${mention}`, 20, finalY + 10);

      // Pied de page
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('ÉcoleApp — Bulletin généré automatiquement', 105, 285, { align: 'center' });
    }
  }

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulletins-${anneeScolaire.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
    },
  });
});