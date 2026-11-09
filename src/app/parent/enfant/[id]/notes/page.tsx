import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ParentNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'PARENT') redirect('/login');

  const { id } = await params;
  const db = await getPrismaDynamic();

  const lien = await db.parentEleve.findUnique({
    where: { parentId_eleveId: { parentId: session.id, eleveId: id } },
  });
  if (!lien) notFound();

  const eleve = await db.user.findUnique({
    where: { id },
    include: {
      inscriptions: {
        include: { classe: true },
        orderBy: { anneeScolaire: 'desc' },
        take: 1,
      },
      notes: {
        include: { matiere: true, evaluation: true },
        orderBy: { date: 'desc' },
      },
    },
  });
  if (!eleve) notFound();

  const classe = eleve.inscriptions[0]?.classe;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/parent/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Notes de {eleve.prenom} {eleve.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          {classe ? classe.nom : 'Aucune classe'} · {eleve.notes.length} note(s)
        </p>
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
            {eleve.notes.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Aucune note</td></tr>
            ) : (
              eleve.notes.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{n.matiere.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{n.evaluation?.nom ?? n.type}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={'font-semibold ' + (n.valeur >= 10 ? 'text-green-600' : 'text-red-600')}>
                      {n.valeur.toFixed(2)}/20
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{n.evaluation?.coefficient ?? n.coefficient}</td>
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