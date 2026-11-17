import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function traiterSeance(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const id = formData.get('id') as string;
  const action = formData.get('action') as string;
  const heuresValidees = parseFloat(formData.get('heuresValidees') as string);
  const motifRejet = (formData.get('motifRejet') as string) || null;

  if (!id || !action) return;

  const db = await getPrismaDynamic();

  if (action === 'confirmer') {
    if (isNaN(heuresValidees) || heuresValidees <= 0) return;
    await db.seanceTravail.update({
      where: { id },
      data: {
        heuresValidees,
        statut: 'CONFIRMEE',
        traiteLe: new Date(),
        traiteParId: session.id,
        motifRejet: null,
      },
    });
  } else if (action === 'rejeter') {
    await db.seanceTravail.update({
      where: { id },
      data: {
        statut: 'REJETEE',
        traiteLe: new Date(),
        traiteParId: session.id,
        motifRejet: motifRejet ?? 'Non spécifié',
      },
    });
  } else if (action === 'modifier') {
    if (isNaN(heuresValidees) || heuresValidees <= 0) return;
    await db.seanceTravail.update({
      where: { id },
      data: {
        heuresValidees,
        traiteLe: new Date(),
        traiteParId: session.id,
      },
    });
  }

  revalidatePath('/admin/seances');
  redirect('/admin/seances?success=1');
}

export default async function AdminSeancesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; statut?: string; horsEmploi?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();

  const filtreStatut = params.statut as 'EN_ATTENTE' | 'CONFIRMEE' | 'REJETEE' | undefined;
  const filtreHorsEmploi = params.horsEmploi === '1';

  const where: any = {};
  if (filtreStatut) where.statut = filtreStatut;
  if (filtreHorsEmploi) where.horsEmploi = true;

  const seances = await db.seanceTravail.findMany({
    where,
    include: {
      professeur: { select: { nom: true, prenom: true, email: true } },
      cours: {
        include: {
          classe: { select: { nom: true } },
          matiere: { select: { nom: true } },
        },
      },
      traitePar: { select: { nom: true, prenom: true } },
    },
    orderBy: [{ statut: 'asc' }, { date: 'desc' }],
    take: 200,
  });

  const nbEnAttente = await db.seanceTravail.count({ where: { statut: 'EN_ATTENTE' } });
  const nbHorsEmploi = await db.seanceTravail.count({ where: { horsEmploi: true } });
  const nbHorsEmploiEnAttente = await db.seanceTravail.count({
    where: { horsEmploi: true, statut: 'EN_ATTENTE' },
  });

  const statutBadge = (s: string) => {
    if (s === 'CONFIRMEE') return 'bg-green-100 text-green-700';
    if (s === 'REJETEE') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  const statutLabel = (s: string) => {
    if (s === 'CONFIRMEE') return '✅ Confirmée';
    if (s === 'REJETEE') return '❌ Rejetée';
    return '⏳ En attente';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🕒 Contrôle des séances professeurs</h1>
          <p className="text-sm text-gray-500">
            {nbEnAttente} séance(s) en attente de validation
          </p>
        </div>
        <Link
          href="/admin/seances/synthese"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          📊 Synthèse mensuelle
        </Link>
      </div>

      {/* Alerte : séances hors emploi */}
      {nbHorsEmploiEnAttente > 0 && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg text-sm flex items-start gap-3">
          <span className="text-xl">🚫</span>
          <div>
            <p className="font-medium">
              {nbHorsEmploiEnAttente} séance(s) en attente sont <strong>hors emploi du temps</strong>.
            </p>
            <p className="text-xs mt-1">
              Ces séances ne correspondent à aucun cours de l&apos;emploi du temps du professeur.
              Vérifiez leur légitimité avant de confirmer. Elles apparaissent avec un fond rouge
              et le badge <span className="inline-block bg-red-100 text-red-800 px-1.5 py-0.5 rounded mx-1 text-xs">🚫 HORS EMPLOI</span>.
            </p>
          </div>
        </div>
      )}

      {params.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
          ✅ Séance traitée avec succès.
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 text-sm flex-wrap">
        <a
          href="/admin/seances"
          className={`px-3 py-1 rounded-full ${!filtreStatut && !filtreHorsEmploi ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Toutes
        </a>
        <a
          href="/admin/seances?statut=EN_ATTENTE"
          className={`px-3 py-1 rounded-full ${filtreStatut === 'EN_ATTENTE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'}`}
        >
          En attente ({nbEnAttente})
        </a>
        <a
          href="/admin/seances?statut=CONFIRMEE"
          className={`px-3 py-1 rounded-full ${filtreStatut === 'CONFIRMEE' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'}`}
        >
          Confirmées
        </a>
        <a
          href="/admin/seances?statut=REJETEE"
          className={`px-3 py-1 rounded-full ${filtreStatut === 'REJETEE' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}
        >
          Rejetées
        </a>
        <a
          href="/admin/seances?horsEmploi=1"
          className={`px-3 py-1 rounded-full ${filtreHorsEmploi ? 'bg-red-700 text-white' : 'bg-red-50 text-red-700 font-medium'}`}
        >
          🚫 Hors emploi ({nbHorsEmploi})
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {seances.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Aucune séance.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Professeur</th>
                <th className="p-3 text-left">Cours</th>
                <th className="p-3 text-center">Déclarées</th>
                <th className="p-3 text-center">Validées</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {seances.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b last:border-0 ${s.horsEmploi ? 'bg-red-50' : ''}`}
                >
                  <td className="p-3">{s.date.toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 font-medium">
                    {s.professeur.prenom} {s.professeur.nom}
                  </td>
                  <td className="p-3 text-xs">
                    {s.cours ? (
                      <span className={s.horsEmploi ? 'text-red-700' : ''}>
                        {s.cours.matiere.nom} — {s.cours.classe.nom}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {s.horsEmploi && (
                      <span className="inline-block bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold ml-2">
                        🚫 HORS EMPLOI
                      </span>
                    )}
                    {s.description && <div className="text-gray-400 mt-1">{s.description}</div>}
                  </td>
                  <td className={`p-3 text-center ${s.horsEmploi ? 'text-red-700 font-medium' : ''}`}>
                    {s.heuresDeclarees} h
                  </td>
                  <td className="p-3 text-center font-medium">
                    {s.heuresValidees != null ? `${s.heuresValidees} h` : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutBadge(s.statut)}`}>
                      {statutLabel(s.statut)}
                    </span>
                    {s.traitePar && (
                      <div className="text-xs text-gray-400 mt-1">
                        par {s.traitePar.prenom} {s.traitePar.nom}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {s.statut === 'EN_ATTENTE' && (
                      <div className="space-y-2">
                        <form action={traiterSeance} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="action" value="confirmer" />
                          <input
                            name="heuresValidees"
                            type="number"
                            step="0.5"
                            min="0.5"
                            defaultValue={s.heuresDeclarees}
                            className="w-16 border rounded px-2 py-1 text-xs"
                          />
                          <button className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                            ✅ Confirmer
                          </button>
                        </form>
                        <form action={traiterSeance} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="action" value="rejeter" />
                          <input
                            name="motifRejet"
                            placeholder="Motif..."
                            className="w-24 border rounded px-2 py-1 text-xs"
                          />
                          <button className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">
                            ❌ Rejeter
                          </button>
                        </form>
                      </div>
                    )}
                    {s.statut === 'CONFIRMEE' && (
                      <form action={traiterSeance} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="action" value="modifier" />
                        <input
                          name="heuresValidees"
                          type="number"
                          step="0.5"
                          min="0.5"
                          defaultValue={s.heuresValidees ?? s.heuresDeclarees}
                          className="w-16 border rounded px-2 py-1 text-xs"
                        />
                        <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                          ✏️ Modifier
                        </button>
                      </form>
                    )}
                    {s.statut === 'REJETEE' && (
                      <span className="text-xs text-gray-400">
                        Traitée le {s.traiteLe?.toLocaleDateString('fr-FR') ?? '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}