import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-900',
  RETARD: 'bg-amber-50 border-amber-200 text-amber-900',
  ANNULATION: 'bg-red-50 border-red-200 text-red-900',
  DEVOIR: 'bg-purple-50 border-purple-200 text-purple-900',
  AUTRE: 'bg-gray-50 border-gray-200 text-gray-900',
};

const TYPE_ICONS: Record<string, string> = {
  INFO: '📢',
  RETARD: '⏰',
  ANNULATION: '❌',
  DEVOIR: '📝',
  AUTRE: '📌',
};

const TYPE_LABELS: Record<string, string> = {
  INFO: 'Information',
  RETARD: 'Retard',
  ANNULATION: 'Annulation',
  DEVOIR: 'Devoir',
  AUTRE: 'Autre',
};

export default async function ParentAnnoncesPage() {
  const session = await getSession();
  if (!session || session.role !== 'PARENT') redirect('/login');

  const db = await getPrismaDynamic();

  // 1. Récupérer les enfants du parent et leurs classes
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
        },
      },
    },
  });

  const eleves = liens.map((l) => l.eleve);
  const classeIds = eleves
    .map((e) => e.inscriptions[0]?.classeId)
    .filter(Boolean) as string[];

  if (classeIds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">📢 Annonces</h1>
        <div className="bg-white p-8 rounded-xl text-center text-gray-500">
          <p className="text-4xl mb-2">📢</p>
          <p>Aucun enfant inscrit dans une classe pour le moment.</p>
          <p className="text-xs text-gray-400 mt-1">
            Contactez l&apos;administration pour inscrire votre enfant.
          </p>
        </div>
      </div>
    );
  }

  // 2. Récupérer les annonces de ces classes
  const maintenant = new Date();
  const annonces = await db.annonce.findMany({
    where: {
      classeId: { in: classeIds },
      OR: [
        { expireLe: null },
        { expireLe: { gt: maintenant } },
      ],
    },
    include: {
      classe: { select: { id: true, nom: true, niveau: true } },
      professeur: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // 3. Grouper les annonces par classe pour l'affichage
  const annoncesParClasse = new Map<string, typeof annonces>();
  for (const a of annonces) {
    if (!annoncesParClasse.has(a.classeId)) {
      annoncesParClasse.set(a.classeId, []);
    }
    annoncesParClasse.get(a.classeId)!.push(a);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📢 Annonces des professeurs</h1>
        <p className="text-gray-500 mt-1">
          {annonces.length} annonce(s) pour les classes de vos enfants
        </p>
      </div>

      {annonces.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center text-gray-500">
          <p className="text-4xl mb-2">📭</p>
          <p>Aucune annonce pour le moment.</p>
          <p className="text-xs text-gray-400 mt-1">
            Les informations publiées par les professeurs de vos enfants apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(annoncesParClasse.entries()).map(([classeId, annoncesClasse]) => {
            const classe = annoncesClasse[0].classe;
            return (
              <div key={classeId} className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  🏫 {classe.nom}
                  <span className="text-sm font-normal text-gray-500">
                    ({classe.niveau}) · {annoncesClasse.length} annonce(s)
                  </span>
                </h2>
                {annoncesClasse.map((a) => {
                  const color = TYPE_COLORS[a.type] || TYPE_COLORS.INFO;
                  const icon = TYPE_ICONS[a.type] || '📢';
                  const label = TYPE_LABELS[a.type] || a.type;
                  return (
                    <div key={a.id} className={`p-4 rounded-lg border ${color}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <span className="text-xs font-medium uppercase opacity-80">{label}</span>
                          <span className="text-xs opacity-60">
                            {new Date(a.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-base mb-1">{a.titre}</h3>
                      <p className="text-sm whitespace-pre-wrap">{a.contenu}</p>
                      <p className="text-xs mt-3 opacity-70">
                        👨‍🏫 {a.professeur.prenom} {a.professeur.nom}
                        {a.expireLe && (
                          <span className="ml-2">
                            · ⏳ Expire le {new Date(a.expireLe).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Lien retour vers le dashboard */}
      <div>
        <Link href="/parent/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Retour à mes enfants
        </Link>
      </div>
    </div>
  );
}