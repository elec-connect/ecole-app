import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';

function mention(moyenne: number): { label: string; color: string } {
  if (moyenne >= 16) return { label: 'Très bien', color: 'text-green-700' };
  if (moyenne >= 14) return { label: 'Bien', color: 'text-green-600' };
  if (moyenne >= 12) return { label: 'Assez bien', color: 'text-blue-600' };
  if (moyenne >= 10) return { label: 'Passable', color: 'text-orange-600' };
  return { label: 'Insuffisant', color: 'text-red-600' };
}

export default async function EtudiantBulletinPage() {
  const session = await getSession();
  if (!session || session.role !== 'ETUDIANT') redirect('/login');

  const db = await getPrismaDynamic();

  const eleve = await db.user.findUnique({
    where: { id: session.id },
    include: {
      inscriptions: {
        include: { classe: true },
        orderBy: { anneeScolaire: 'desc' },
        take: 1,
      },
      notes: { include: { matiere: true, evaluation: true } },
    },
  });

  if (!eleve) redirect('/login');
  const classe = eleve.inscriptions[0]?.classe;

  // Coefficients par classe
  const volumes = classe
    ? await db.volumeHoraire.findMany({ where: { classeId: classe.id } })
    : [];
  const coefParMatiere: Record<string, number> = {};
  volumes.forEach((v) => {
    coefParMatiere[v.matiereId] = v.coefficient;
  });

  const parMatiere = new Map<
    string,
    { nom: string; coefMatiere: number; notes: typeof eleve.notes }
  >();
  for (const n of eleve.notes) {
    if (!parMatiere.has(n.matiereId)) {
      parMatiere.set(n.matiereId, {
        nom: n.matiere.nom,
        coefMatiere: coefParMatiere[n.matiereId] ?? n.matiere.coefficient,
        notes: [],
      });
    }
    parMatiere.get(n.matiereId)!.notes.push(n);
  }

  const matieres = Array.from(parMatiere.values()).map((m) => {
    const somme = m.notes.reduce(
      (a, n) => a + n.valeur * (n.evaluation?.coefficient ?? n.coefficient),
      0
    );
    const totalCoef = m.notes.reduce(
      (a, n) => a + (n.evaluation?.coefficient ?? n.coefficient),
      0
    );
    return {
      nom: m.nom,
      coefMatiere: m.coefMatiere,
      moyenne: totalCoef > 0 ? Math.round((somme / totalCoef) * 100) / 100 : 0,
      nbNotes: m.notes.length,
    };
  });

  let sommePonderee = 0;
  let totalCoefs = 0;
  for (const m of matieres) {
    sommePonderee += m.moyenne * m.coefMatiere;
    totalCoefs += m.coefMatiere;
  }
  const moyenneGenerale =
    totalCoefs > 0 ? Math.round((sommePonderee / totalCoefs) * 100) / 100 : 0;
  const m = mention(moyenneGenerale);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">BULLETIN SCOLAIRE</h2>
          <p className="text-gray-500 text-sm mt-1">
            {classe ? classe.nom + ' · ' + classe.anneeScolaire : 'Année en cours'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-500">Élève</p>
            <p className="font-semibold text-gray-900">
              {eleve.prenom} {eleve.nom}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Classe</p>
            <p className="font-semibold text-gray-900">{classe?.nom ?? '—'}</p>
          </div>
        </div>

        <table className="w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Matière
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Coef.
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Notes
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Moyenne
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matieres.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                  Aucune note disponible
                </td>
              </tr>
            ) : (
              matieres.map((mat) => (
                <tr key={mat.nom}>
                  <td className="px-4 py-3 text-sm font-medium">{mat.nom}</td>
                  <td className="px-4 py-3 text-sm text-center">{mat.coefMatiere}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{mat.nbNotes}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={
                        'font-semibold ' +
                        (mat.moyenne >= 10 ? 'text-green-600' : 'text-red-600')
                      }
                    >
                      {mat.moyenne.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Moyenne générale</p>
            <p
              className={
                'text-3xl font-bold ' +
                (moyenneGenerale >= 10 ? 'text-green-600' : 'text-red-600')
              }
            >
              {moyenneGenerale.toFixed(2)}/20
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Mention</p>
            <p className={'text-lg font-semibold ' + m.color}>{m.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}