import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  ABSENT: { label: 'Absent', color: 'bg-red-100 text-red-700' },
  RETARD: { label: 'Retard', color: 'bg-orange-100 text-orange-700' },
  JUSTIFIE: { label: 'Justifié', color: 'bg-blue-100 text-blue-700' },
};

export default async function ParentAbsencesPage({
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
      inscriptions: { include: { classe: true }, orderBy: { anneeScolaire: 'desc' }, take: 1 },
      presences: {
        where: { statut: { in: ['ABSENT', 'RETARD', 'JUSTIFIE'] } },
        include: { cours: { include: { matiere: true, professeur: true } } },
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
          Absences de {eleve.prenom} {eleve.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          {classe ? classe.nom : 'Aucune classe'} · {eleve.presences.length} absence(s)
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Matière</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Professeur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eleve.presences.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Aucune absence 🎉</td></tr>
            ) : (
              eleve.presences.map((p) => {
                const s = STATUT_LABEL[p.statut] ?? { label: p.statut, color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-sm font-medium">{p.cours.matiere.nom}</td>
                    <td className="px-4 py-3 text-sm">{p.cours.professeur.prenom} {p.cours.professeur.nom}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + s.color}>{s.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}