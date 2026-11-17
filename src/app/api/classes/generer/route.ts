import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';

const NIVEAUX = [
  // Primaire
  { value: '1ere_primaire', label: '1ère primaire' },
  { value: '2eme_primaire', label: '2ème primaire' },
  { value: '3eme_primaire', label: '3ème primaire' },
  { value: '4eme_primaire', label: '4ème primaire' },
  { value: '5eme_primaire', label: '5ème primaire' },
  { value: '6eme_primaire', label: '6ème primaire' },
  // Secondaire
  { value: '7eme', label: '7ème' },
  { value: '8eme', label: '8ème' },
  { value: '9eme', label: '9ème' },
  { value: '1ere', label: '1ère' },
  { value: '2eme', label: '2ème' },
  { value: '3eme', label: '3ème' },
  { value: '4eme', label: '4ème' },
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ erreur: 'Action réservée au Super Administrateur.' }, { status: 401 });
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const anneeScolaire = config.anneeScolaireCourante;

  if (!anneeScolaire) {
    return NextResponse.json({ erreur: 'Année scolaire non configurée.' }, { status: 400 });
  }

  let nbCreees = 0;
  let nbExistantes = 0;

  for (const niveau of NIVEAUX) {
    for (const section of SECTIONS) {
      const nom = `${niveau.label} ${section}`; // ex: "7ème A"
      
      // Vérifier si la classe existe déjà
      const existante = await db.classe.findFirst({
        where: { nom, anneeScolaire },
      });

      if (existante) {
        nbExistantes++;
      } else {
        await db.classe.create({
          data: {
            nom,
            niveau: niveau.value, // ex: "7eme"
            anneeScolaire,
          },
        });
        nbCreees++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    nbCreees,
    nbExistantes,
    message: `${nbCreees} classe(s) créée(s), ${nbExistantes} déjà existante(s).`,
  });
}