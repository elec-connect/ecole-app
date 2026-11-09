import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ParentDashboard() {
  const session = await getSession();
  if (!session) return null;

  const db = await getPrismaDynamic();
  const liens = await db.parentEleve.findMany({
    where: { parentId: session.id },
    include: {
      eleve: {
        include: {
          inscriptions: {
            include: { classe: true },
            orderBy: { anneeScolaire: 'desc' },
            take: 1,
          },
          notes: true,
          presences: { where: { statut: { in: ['ABSENT', 'RETARD'] } } },
        },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes enfants</h1>
        <p className="text-gray-500 mt-1">{liens.length} enfant(s)</p>
      </div>

      {liens.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Aucun enfant lié à votre compte. Contactez l'administration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liens.map((lien) => {
            const eleve = lien.eleve;
            const classe = eleve.inscriptions[0]?.classe;
            return (
              <div key={lien.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {eleve.prenom} {eleve.nom}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {classe ? classe.nom + ' (' + classe.niveau + ')' : 'Aucune classe'}
                    </p>
                    {lien.relation && (
                      <p className="text-xs text-gray-400 mt-1">Relation : {lien.relation}</p>
                    )}
                  </div>
                  <div className="text-3xl">👨‍🎓</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-700 uppercase">Notes</p>
                    <p className="text-xl font-bold text-blue-700">{eleve.notes.length}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-700 uppercase">Absences</p>
                    <p className="text-xl font-bold text-orange-700">{eleve.presences.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Link href={'/parent/enfant/' + eleve.id + '/notes'} className="text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded">
                    📝 Notes
                  </Link>
                  <Link href={'/parent/enfant/' + eleve.id + '/absences'} className="text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded">
                    📅 Absences
                  </Link>
                  <Link href={'/parent/enfant/' + eleve.id + '/bulletin'} className="text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded">
                    📄 Bulletin
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}