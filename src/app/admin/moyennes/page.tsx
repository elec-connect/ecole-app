import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import Link from 'next/link';

export default async function MoyennesIndexPage() {
  const db = await getPrismaDynamic();

  const classes = await db.classe.findMany({
    include: {
      _count: { select: { inscriptions: true, cours: true } },
      professeurPrincipal: { select: { prenom: true, nom: true } },
    },
    orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Moyennes par classe</h1>
        <p className="text-gray-500 mt-1">
          {classes.length} classe(s) · Sélectionnez une classe pour voir les moyennes
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Aucune classe enregistrée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={'/admin/moyennes/' + c.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-300 transition block"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">{c.nom}</h2>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {c.niveau}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {c._count.inscriptions} élève(s) · {c._count.cours} cours
              </p>
              {c.professeurPrincipal && (
                <p className="text-xs text-gray-400 mt-2">
                  Prof. principal : {c.professeurPrincipal.prenom} {c.professeurPrincipal.nom}
                </p>
              )}
              <p className="text-xs text-blue-600 font-medium mt-3">Voir les moyennes →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}