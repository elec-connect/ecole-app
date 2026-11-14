import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const CRENEAUX = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
];

function nettoyer(texte: string): string {
  return texte
    .replace(/🏫/g, '')
    .replace(/Ø<ßë/g, '')
    .replace(/[^\x20-\x7E\u00C0-\u017F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const COULEURS_MATIERES: Record<string, [number, number, number]> = {
  'Mathématiques': [219, 234, 254],
  'Français': [254, 226, 226],
  'Arabe': [254, 243, 199],
  'Anglais': [220, 252, 231],
  'Physique': [237, 233, 254],
  'Chimie': [243, 232, 255],
  'Science et vie': [204, 251, 241],
  'Histoire': [255, 237, 213],
  'Géographie': [255, 228, 230],
  'Éducation islamique': [224, 242, 254],
  'Sport': [220, 252, 231],
  'Informatique': [219, 234, 254],
  'Technique': [243, 244, 246],
};

export type CoursEmploi = {
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  classe: { nom: string };
  matiere: { nom: string };
  professeur: { prenom: string; nom: string };
  salle: { nom: string } | null;
};

export function genererPDFEmploi(params: {
  cours: CoursEmploi[];
  mode: 'prof' | 'eleve' | 'salle';
  titre: string;
  anneeScolaire: string;
}): Buffer {
  const { cours, mode, titre, anneeScolaire } = params;

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

  const pdf = new jsPDF('l', 'mm', 'a4');

  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, 297, 25, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(nettoyer(titre), 148, 12, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Année scolaire : ${anneeScolaire || 'N/A'}`, 148, 19, { align: 'center' });

  pdf.setTextColor(0, 0, 0);

  const body: any[][] = [];

  for (const cr of CRENEAUX) {
    const ligne: any[] = [cr];
    for (const jour of JOURS) {
      const cell = grille[cr]?.[jour];
      if (cell) {
        const prof = mode === 'eleve' ? `\n${cell.prof}` : '';
        const salle = cell.salle ? `\n${cell.salle}` : '';
        ligne.push(`${cell.matiere}${prof}${salle}`);
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
      1: { cellWidth: 42 }, 2: { cellWidth: 42 }, 3: { cellWidth: 42 },
      4: { cellWidth: 42 }, 5: { cellWidth: 42 }, 6: { cellWidth: 42 },
    },
    didParseCell: (data) => {
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

  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} - ÉcoleApp`,
    148,
    200,
    { align: 'center' }
  );

  return Buffer.from(pdf.output('arraybuffer'));
}