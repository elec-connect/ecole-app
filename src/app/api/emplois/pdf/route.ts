import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdminOrSuper } from '@/lib/api-helpers';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const JOURS_INDEX = [1, 2, 3, 4, 5, 6];
const CRENEAUX = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
];

// ⭐ Nettoyer les caractères qui cassent jsPDF
function nettoyer(texte: string): string {
  return texte
    .replace(/🏫/g, '')          // Supprimer l'emoji salle
    .replace(/Ø<ßë/g, '')        // Supprimer les caractères corrompus
    .replace(/[^\x20-\x7E\u00C0-\u017F]/g, '') // Garder ASCII + accents latins
    .replace(/\s+/g, ' ')
    .trim();
}

// ⭐ Couleurs par matière (palette professionnelle)
const COULEURS_MATIERES: Record<string, [number, number, number]> = {
  'Mathématiques': [219, 234, 254],   // bleu clair
  'Français': [254, 226, 226],        // rouge clair
  'Arabe': [254, 243, 199],           // jaune clair
  'Anglais': [220, 252, 231],         // vert clair
  'Physique': [237, 233, 254],        // violet clair
  'Chimie': [243, 232, 255],          // violet plus clair
  'Science et vie': [204, 251, 241],  // teal clair
  'Histoire': [255, 237, 213],        // orange clair
  'Géographie': [255, 228, 230],      // rose clair
  'Éducation islamique': [224, 242, 254], // bleu très clair
  'Sport': [220, 252, 231],           // vert
  'Informatique': [219, 234, 254],    // bleu
  'Technique': [243, 244, 246],       // gris clair
};

function getCouleurMatiere(matiere: string): [number, number, number] {
  return COULEURS_MATIERES[matiere] ?? [249, 250, 251];
}

export const POST = withAdminOrSuper(async (req) => {
  const { mode, id, anneeScolaire } = await req.json();

  if (!mode || !id) {
    return NextResponse.json({ erreur: 'mode et id requis' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

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

  // Construire la grille
  const grille: Record<string, Record<string, { matiere: string; prof: string; salle: string }>> = {};
  for (const cr of CRENEAUX) grille[cr] = {};

  for (const c of cours) {
    const key = `${c.heureDebut}-${c.heureFin}`;
    if (!grille[key]) grille[key] = {};
    const jourNom = JOURS[c.jourSemaine - 1] ?? '';
    grille[key][jourNom] = {
      matiere: nettoyer(c.matiere.nom),
      prof: nettoyer(`${c.professeur.prenom} ${c.professeur.nom}`),
      salle: nettoyer(c.salle?.nom ?? ''),
    };
  }

  // Générer le PDF
  const pdf = new jsPDF('l', 'mm', 'a4'); // paysage

  // En-tête coloré
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, 297, 25, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titre, 148, 12, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Année scolaire : ${anneeScolaire || 'N/A'}`, 148, 19, { align: 'center' });

  pdf.setTextColor(0, 0, 0);

  // Construire le corps du tableau
  const body: any[][] = [];

  for (const cr of CRENEAUX) {
    const ligne: any[] = [cr];
    for (const jour of JOURS) {
      const cell = grille[cr]?.[jour];
      if (cell) {
        ligne.push(`${cell.matiere}\n${mode === 'eleve' ? cell.prof : ''}\n${cell.salle}`);
      } else {
        ligne.push('');
      }
    }
    body.push(ligne);
  }

  autoTable(pdf, {
    startY: 30,
    head: [['Horaire', ...JOURS]],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', halign: 'center', fillColor: [243, 244, 246] },
      1: { cellWidth: 42 },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 42 },
      5: { cellWidth: 42 },
      6: { cellWidth: 42 },
    },
    didParseCell: (data) => {
      // Colorer les cellules selon la matière
      if (data.section === 'body' && data.column.index > 0) {
        const cellText = data.cell.text.join(' ');
        for (const [matiere, couleur] of Object.entries(COULEURS_MATIERES)) {
          if (cellText.includes(matiere)) {
            data.cell.styles.fillColor = couleur;
            break;
          }
        }
      }
    },
  });

  // Pied de page
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} - ÉcoleApp`,
    148,
    200,
    { align: 'center' }
  );

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="emploi-${mode}-${id}.pdf"`,
    },
  });
});