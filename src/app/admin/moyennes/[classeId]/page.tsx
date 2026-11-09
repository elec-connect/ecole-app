import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MoyennesTable } from '@/components/admin/MoyennesTable';

export default async function MoyennesClassePage({
  params,
}: {
  params: Promise<{ classeId: string }>;
}) {
  const { classeId } = await params;
  const db = await getPrismaDynamic();

  const classe = await db.classe.findUnique({
    where: { id: classeId },
    include: {
      _count: { select: { inscriptions: true } },
      professeurPrincipal: { select: { prenom: true, nom: true } },
    },
  });

  if (!classe) notFound();

  const matieres = await db.matiere.findMany({ orderBy: { nom: 'asc' } });

  const etudiants = await db.user.findMany({
    where: {
      role: 'ETUDIANT',
      actif: true,
      inscriptions: { some: { classeId } },
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      notes: {
        include: { matiere: true, evaluation: true },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  // Calculer les moyennes par matière + générale
  const etudiantsAvecMoyennes = etudiants.map((et) => {
    const notesParMatiere = new Map<string, { valeur: number; coef: number }[]>();

    for (const note of et.notes) {
      const key = note.matiereId;
      if (!notesParMatiere.has(key)) notesParMatiere.set(key, []);
      const coef = note.evaluation?.coefficient ?? note.coefficient;
      notesParMatiere.get(key)!.push({ valeur: note.valeur, coef });
    }

    const moyennesParMatiere: Record<string, { moyenne: number | null; nbNotes: number }> = {};

    for (const mat of matieres) {
      const data = notesParMatiere.get(mat.id);
      if (data && data.length > 0) {
        const somme = data.reduce((a, v) => a + v.valeur * v.coef, 0);
        const totalCoef = data.reduce((a, v) => a + v.coef, 0);
        moyennesParMatiere[mat.id] = {
          moyenne: totalCoef > 0 ? Math.round((somme / totalCoef) * 100) / 100 : null,
          nbNotes: data.length,
        };
      } else {
        moyennesParMatiere[mat.id] = { moyenne: null, nbNotes: 0 };
      }
    }

    let sommePonderee = 0;
    let totalCoefs = 0;
    for (const mat of matieres) {
      const mm = moyennesParMatiere[mat.id];
      if (mm.moyenne !== null) {
        sommePonderee += mm.moyenne * mat.coefficient;
        totalCoefs += mat.coefficient;
      }
    }

    return {
      id: et.id,
      nom: et.nom,
      prenom: et.prenom,
      email: et.email,
      moyennesParMatiere,
      moyenneGenerale: totalCoefs > 0 ? Math.round((sommePonderee / totalCoefs) * 100) / 100 : null,
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/moyennes"
          className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
        >
          ← Toutes les classes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Moyennes — {classe.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          {etudiants.length} élève(s) · {matieres.length} matière(s)
          {classe.professeurPrincipal && (
            <> · Prof. principal : {classe.professeurPrincipal.prenom} {classe.professeurPrincipal.nom}</>
          )}
        </p>
      </div>

      <MoyennesTable
        matieres={JSON.parse(JSON.stringify(matieres))}
        etudiants={JSON.parse(JSON.stringify(etudiantsAvecMoyennes))}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">📊 Légende</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-green-700 font-bold">≥ 16 : Très bien</span>
          <span className="text-green-600 font-semibold">≥ 14 : Bien</span>
          <span className="text-blue-600 font-semibold">≥ 12 : Assez bien</span>
          <span className="text-orange-600 font-semibold">≥ 10 : Passable</span>
          <span className="text-red-600 font-semibold">&lt; 10 : Insuffisant</span>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Moyenne générale pondérée par les coefficients des matières (définis dans <strong>Matières</strong>).
        </p>
      </div>
    </div>
  );
}