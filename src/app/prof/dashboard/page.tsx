import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import Link from 'next/link';

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default async function ProfDashboard() {
  const session = await getSession();
  if (!session) return null;

  const db = await getPrismaDynamic();
  const prof = await db.user.findUnique({ where: { id: session.id } });

  const cours = prof
    ? await db.cours.findMany({
        where: { professeurId: prof.id },
        include: {
          classe: { include: { _count: { select: { inscriptions: true } } } },
          matiere: true,
          _count: { select: { presences: true, devoirs: true } },
        },
        orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
      })
    : [];

  const totalEleves = cours.reduce((sum, c) => sum + c.classe._count.inscriptions, 0);
  const totalPresences = cours.reduce((sum, c) => sum + c._count.presences, 0);
  const totalDevoirs = cours.reduce((sum, c) => sum + c._count.devoirs, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {prof?.prenom} 👋</h1>
        <p className="text-gray-500 mt-1">Bienvenue dans votre espace professeur</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-3xl font-bold text-blue-600">{cours.length}</p>
          <p className="text-sm text-gray-600 mt-1">Cours assignés</p>
        </div>
        <div className="bg-green-50 rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-3xl font-bold text-green-600">{totalEleves}</p>
          <p className="text-sm text-gray-600 mt-1">Élèves au total</p>
        </div>
        <div className="bg-purple-50 rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-3xl font-bold text-purple-600">{totalPresences}</p>
          <p className="text-sm text-gray-600 mt-1">Présences enregistrées</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mes cours</h2>
          <Link
            href="/prof/appel"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ✅ Faire l&apos;appel
          </Link>
        </div>

        {cours.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun cours assigné pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {cours.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {c.matiere.nom} — {c.classe.nom}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {JOURS[c.jourSemaine]} · {c.heureDebut}-{c.heureFin} ·{' '}
                    {c.classe._count.inscriptions} élèves
                  </p>
                </div>
                <Link
                  href={'/prof/notes/' + c.id}
                  className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  📝 Notes
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/prof/appel"
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
        >
          <p className="text-2xl mb-2">✅</p>
          <p className="font-semibold text-gray-900">Faire l&apos;appel</p>
          <p className="text-xs text-gray-500 mt-1">Marquer les présences du jour</p>
        </Link>
        <Link
          href="/prof/devoirs"
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
        >
          <p className="text-2xl mb-2">📚</p>
          <p className="font-semibold text-gray-900">Gérer les devoirs</p>
          <p className="text-xs text-gray-500 mt-1">{totalDevoirs} devoir(s) créé(s)</p>
        </Link>
      </div>
    </div>
  );
}