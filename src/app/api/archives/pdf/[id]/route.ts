import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { jsPDF } from 'jspdf';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = await getPrismaDynamic();

  const archive = await db.archive.findUnique({
    where: { id },
  });

  if (!archive) {
    return NextResponse.json({ erreur: 'Archive introuvable' }, { status: 404 });
  }

  // Décoder le contenu JSON
  let data: any = {};
  try {
    data = JSON.parse(archive.contenu);
  } catch (e) {
    return NextResponse.json({ erreur: 'Contenu de l\'archive invalide' }, { status: 500 });
  }

  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const addText = (text: string, size = 11, style: 'normal' | 'bold' = 'normal', color = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(color[0], color[1], color[2]);
    
    // Remplacement des caractères spéciaux non supportés
    const cleanText = text
      .replace(/[^\x00-\xFF]/g, '') // Supprime tout ce qui n'est pas ASCII étendu (emojis, etc.)
      .trim();

    const lines = doc.splitTextToSize(cleanText, pageWidth - margin * 2);
    
    for (const line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += size * 0.5;
    }
    y += 4;
  };

  const addLine = () => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // --- EN-TÊTE ---
  addText(`Archive scolaire : ${archive.nom}`, 18, 'bold', [30, 64, 175]);
  addText(`Annee scolaire : ${archive.anneeScolaire}`, 12, 'normal', [100, 100, 100]);
  addText(`Date d'archivage : ${archive.createdAt.toLocaleDateString('fr-FR')} a ${archive.createdAt.toLocaleTimeString('fr-FR')}`, 10, 'normal', [100, 100, 100]);
  addText(`Type : ${archive.type} | Format d'origine : ${archive.format.toUpperCase()}`, 10, 'normal', [100, 100, 100]);
  addLine();

  // --- STATISTIQUES ---
  addText('Statistiques', 14, 'bold', [30, 64, 175]);
  addText(`- Nombre de classes : ${archive.nbClasses}`);
  addText(`- Nombre d'eleves : ${archive.nbEleves}`);
  addText(`- Nombre de notes : ${archive.nbNotes}`);
  addLine();

  // --- LISTE DES CLASSES ---
  if (data.classes && data.classes.length > 0) {
    addText('Liste des classes', 14, 'bold', [30, 64, 175]);
    data.classes.forEach((c: any, idx: number) => {
      addText(`${idx + 1}. ${c.nom} (Niveau: ${c.niveau}) - ${c.inscriptions?.length ?? 0} eleve(s)`, 11, 'bold');
      if (c.inscriptions && c.inscriptions.length > 0) {
        c.inscriptions.forEach((ins: any) => {
          if (ins.etudiant) {
            addText(`   - ${ins.etudiant.prenom} ${ins.etudiant.nom} (${ins.etudiant.email})`, 10, 'normal', [80, 80, 80]);
          }
        });
      }
    });
    addLine();
  }

  // --- COMPTABILITÉ ÉLÈVES ---
  if (data.fraisScolarite && data.fraisScolarite.length > 0) {
    addText('Frais de scolarite (Eleves)', 14, 'bold', [30, 64, 175]);
    data.fraisScolarite.forEach((f: any) => {
      const totalPaye = f.paiements?.reduce((sum: number, p: any) => sum + p.montant, 0) ?? 0;
      addText(`- ${f.eleve?.prenom} ${f.eleve?.nom} : ${f.montantMensuel} DT/mois - Paye : ${totalPaye} DT`, 10);
    });
    addLine();
  }

  // --- COMPTABILITÉ PROFESSEURS ---
  if (data.tarifsProfesseurs && data.tarifsProfesseurs.length > 0) {
    addText('Paie des professeurs', 14, 'bold', [30, 64, 175]);
    data.tarifsProfesseurs.forEach((t: any) => {
      const totalPaye = t.paiements?.reduce((sum: number, p: any) => sum + p.montant, 0) ?? 0;
      addText(`- ${t.professeur?.prenom} ${t.professeur?.nom} : Taux ${t.tauxHoraire} DT/h - Total paye : ${totalPaye} DT`, 10);
    });
    addLine();
  }

  // --- PIED DE PAGE ---
  addText(`Document genere le ${new Date().toLocaleString('fr-FR')} par EcoleApp.`, 9, 'normal', [150, 150, 150]);

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="archive-${archive.anneeScolaire}.pdf"`,
    },
  });
}