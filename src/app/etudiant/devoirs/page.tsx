import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic'; // ⭐ Force la lecture fraîche

export default async function EtudiantDevoirsPage() {
  const session = await getSession();
  if (!session || session.role !== 'ETUDIANT') redirect('/login');

  const db = await getPrismaDynamic();

  // 1. Récupérer la classe actuelle de l'élève
  const inscription = await db.inscription.findFirst({
    where: { etudiantId: session.id },
    orderBy: { anneeScolaire: 'desc' },
    include: { classe: true },
  });

  if (!inscription) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">📚 Mes devoirs</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
          Vous n'êtes inscrit dans aucune classe pour le moment. Contactez l'administration.
        </div>
      </div>
    );
  }

  // 2. Récupérer les devoirs des cours de cette classe
  const devoirs = await db.devoir.findMany({
    where: {
      cours: {
        classeId: inscription.classeId,
      },
    },
    include: {
      cours: {
        include: {
          matiere: { select: { nom: true, coefficient: true } },
          professeur: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { deadline: 'asc' }, // Les plus proches en premier
  });

  const maintenant = new Date();
  const enRetard = devoirs.filter((d) => new Date(d.deadline) < maintenant);
  const aVenir = devoirs.filter((d) => new Date(d.deadline) >= maintenant);

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function joursRestants(d: Date | string) {
    const diff = Math.ceil((new Date(d).getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `En retard de ${Math.abs(diff)} jour(s)`;
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    return `Dans ${diff} jours`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📚 Mes devoirs</h1>
        <p className="text-gray-500 mt-1">
          Classe : <strong>{inscription.classe.nom}</strong> · {devoirs.length} devoir(s) au total
        </p>
      </div>

      {/* Devoirs à venir */}
      {aVenir.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">📅 À rendre</h2>
          {aVenir.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {d.cours.matiere.nom}
                    </span>
                    <span className="text-xs text-gray-400">
                      Coef. {d.cours.matiere.coefficient}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{d.titre}</h3>
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
                  <span className="inline-block mt-2 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded">
                    {joursRestants(d.deadline)}
                  </span>
                </div>
              </div>
              {d.fichierUrl && (
                <a
                  href={d.fichierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-xs text-blue-600 hover:underline"
                >
                  📎 Fichier joint
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Devoirs en retard */}
      {enRetard.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700">⚠️ En retard</h2>
          {enRetard.map((d) => (
            <div key={d.id} className="bg-red-50 rounded-xl border border-red-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      {d.cours.matiere.nom}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{d.titre}</h3>
                  {d.description && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{d.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">Échéance dépassée</p>
                  <p className="font-semibold text-red-700 text-sm">{formatDate(d.deadline)}</p>
                  <span className="inline-block mt-2 text-xs font-medium bg-red-200 text-red-800 px-2 py-1 rounded">
                    {joursRestants(d.deadline)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {devoirs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-4xl mb-2">📚</p>
          <p className="text-gray-500">Aucun devoir pour le moment.</p>
          <p className="text-xs text-gray-400 mt-1">
            Les devoirs donnés par vos professeurs apparaîtront ici.
          </p>
        </div>
      )}
    </div>
  );
}