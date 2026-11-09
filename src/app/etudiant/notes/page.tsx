import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';

export default async function EtudiantNotesPage() {
  const session = await getSession();
  if (!session || session.role !== 'ETUDIANT') redirect('/login');

  const db = await getPrismaDynamic();

  const notes = await db.note.findMany({
    where: { etudiantId: session.id },
    include: { matiere: true, evaluation: true },
    orderBy: { date: 'desc' },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes notes</h1>
        <p className="text-gray-500 mt-1">{notes.length} note(s) enregistrée(s)</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Matière</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Évaluation</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Note</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Coef.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {notes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  Aucune note pour le moment
                </td>
              </tr>
            ) : (
              notes.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{n.matiere.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {n.evaluation?.nom ?? n.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={
                        'font-semibold ' +
                        (n.valeur >= 10 ? 'text-green-600' : 'text-red-600')
                      }
                    >
                      {n.valeur.toFixed(2)}/20
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {n.evaluation?.coefficient ?? n.coefficient}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(n.date).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}