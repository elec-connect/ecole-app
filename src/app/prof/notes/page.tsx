import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import Link from 'next/link';

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default async function NotesListPage() {
  const session = await getSession();
  if (!session) return null;

  const db = await getPrismaDynamic();
  const cours = await db.cours.findMany({
    where: { professeurId: session.id },
    include: {
      classe: { include: { _count: { select: { inscriptions: true } } } },
      matiere: true,
      _count: { select: { presences: true } },
    },
    orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saisie des notes</h1>
        <p className="text-gray-500 mt-1">Choisissez un cours pour saisir les notes</p>
      </div>

      {cours.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Aucun cours assigné.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cours.map((c) => (
            <Link key={c.id} href={'/prof/notes/' + c.id}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition cursor-pointer h-full">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">{c.matiere.nom}</h2>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                    Coef. {c.matiere.coefficient}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {c.classe.nom} · {c.classe._count.inscriptions} élèves
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {JOURS[c.jourSemaine]} {c.heureDebut}-{c.heureFin}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}