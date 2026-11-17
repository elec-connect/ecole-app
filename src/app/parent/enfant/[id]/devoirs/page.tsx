import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ParentDevoirsEnfantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== 'PARENT') redirect('/login');

  const db = await getPrismaDynamic();

  // Vérifier que l'enfant appartient bien au parent
  const lien = await db.parentEleve.findFirst({
    where: { parentId: session.id, eleveId: id },
    include: {
      eleve: {
        include: {
          inscriptions: {
            include: { classe: true },
            orderBy: { anneeScolaire: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!lien) {
    redirect('/parent/dashboard');
  }

  const eleve = lien.eleve;
  const classe = eleve.inscriptions[0]?.classe;

  if (!classe) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/parent/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Retour
        </Link>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
          {eleve.prenom} n'est inscrit dans aucune classe pour le moment.
        </div>
      </div>
    );
  }

  // Récupérer les devoirs de la classe
  const devoirs = await db.devoir.findMany({
    where: { cours: { classeId: classe.id } },
    include: {
      cours: {
        include: {
          matiere: { select: { nom: true } },
          professeur: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { deadline: 'asc' },
  });

  const maintenant = new Date();
  const aVenir = devoirs.filter((d) => new Date(d.deadline) >= maintenant);
  const enRetard = devoirs.filter((d) => new Date(d.deadline) < maintenant);

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/parent/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Retour
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          📚 Devoirs de {eleve.prenom} {eleve.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          Classe : <strong>{classe.nom}</strong> · {devoirs.length} devoir(s)
        </p>
      </div>

      {aVenir.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">📅 À rendre</h2>
          {aVenir.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {d.cours.matiere.nom}
                  </span>
                  <h3 className="font-bold text-gray-900 text-lg mt-1">{d.titre}</h3>
                  {d.description && (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{d.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    👨‍🏫 {d.cours.professeur.prenom} {d.cours.professeur.nom}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">Échéance</p>
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(d.deadline)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {enRetard.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700">⚠️ En retard</h2>
          {enRetard.map((d) => (
            <div key={d.id} className="bg-red-50 rounded-xl border border-red-200 p-5">
              <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded">
                {d.cours.matiere.nom}
              </span>
              <h3 className="font-bold text-gray-900 text-lg mt-1">{d.titre}</h3>
              {d.description && (
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{d.description}</p>
              )}
              <p className="text-xs text-red-700 mt-3">
                Échéance dépassée : {formatDate(d.deadline)}
              </p>
            </div>
          ))}
        </div>
      )}

      {devoirs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-4xl mb-2">📚</p>
          <p className="text-gray-500">Aucun devoir pour le moment.</p>
        </div>
      )}
    </div>
  );
}