import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function declarerSeance(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || session.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  const dateStr = formData.get('date') as string;
  const heures = parseFloat(formData.get('heures') as string);
  const description = (formData.get('description') as string) || null;
  const coursId = (formData.get('coursId') as string) || null;

  if (!dateStr || isNaN(heures) || heures <= 0) return;

  const dateSeance = new Date(dateStr);
  const aujourdHui = new Date();
  aujourdHui.setHours(23, 59, 59, 999); // fin de journée

  // ⭐ 1. Bloquer les dates futures
  if (dateSeance > aujourdHui) {
    redirect('/prof/seances?erreur=date-future');
  }

  const db = await getPrismaDynamic();

  // ⭐ 2. Vérifier si la séance correspond à un cours de l'emploi du temps
  let horsEmploi = true;

  if (coursId) {
    // Si le prof a sélectionné un cours, on vérifie que ce cours existe bien
    const cours = await db.cours.findFirst({
      where: { id: coursId, professeurId: session.id },
    });
    if (cours) {
      // Vérifier que le jour de la semaine correspond
      const jourSemaine = dateSeance.getDay(); // 0=dimanche, 1=lundi, ..., 6=samedi
      // Convertir pour matcher votre schéma (à adapter selon comment vous stockez jourSemaine)
      // Hypothèse : jourSemaine = 1 pour lundi, 2 pour mardi, ..., 6 pour samedi
      const jourNormalise = jourSemaine === 0 ? 7 : jourSemaine; // dimanche = 7
      horsEmploi = cours.jourSemaine !== jourNormalise;
    }
  } else {
    // Si le prof n'a pas sélectionné de cours, on cherche s'il a un cours ce jour-là
    const jourSemaine = dateSeance.getDay();
    const jourNormalise = jourSemaine === 0 ? 7 : jourSemaine;
    const coursDuJour = await db.cours.findFirst({
      where: { professeurId: session.id, jourSemaine: jourNormalise },
    });
    horsEmploi = !coursDuJour;
  }

  await db.seanceTravail.create({
    data: {
      professeurId: session.id,
      coursId: coursId || null,
      date: dateSeance,
      heuresDeclarees: heures,
      description,
      statut: 'EN_ATTENTE',
      horsEmploi,
    },
  });

  revalidatePath('/prof/seances');
  redirect('/prof/seances?success=1');
}

export default async function ProfSeancesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; erreur?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session || session.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  const db = await getPrismaDynamic();

  const seances = await db.seanceTravail.findMany({
    where: { professeurId: session.id },
    include: {
      cours: {
        include: {
          classe: { select: { nom: true } },
          matiere: { select: { nom: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
    take: 50,
  });

  const cours = await db.cours.findMany({
    where: { professeurId: session.id },
    include: {
      classe: { select: { nom: true } },
      matiere: { select: { nom: true } },
    },
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

  const totalConfirmees = seances
    .filter((s) => s.statut === 'CONFIRMEE')
    .reduce((sum, s) => sum + (s.heuresValidees ?? 0), 0);

  const nbHorsEmploi = seances.filter((s) => s.horsEmploi).length;

  // Date max = aujourd'hui (pour bloquer les dates futures)
  const aujourdHui = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📅 Mes séances travaillées</h1>
        <p className="text-sm text-gray-500">
          Déclarez les heures travaillées. L&apos;administration les contrôlera et les validera.
        </p>
      </div>

      {params.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
          ✅ Séance déclarée. Elle est en attente de validation par l&apos;administration.
        </div>
      )}

      {params.erreur === 'date-future' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          ❌ Vous ne pouvez pas déclarer une séance à une date future. Seules les séances passées ou du jour sont autorisées.
        </div>
      )}

      {/* Alerte : séances hors emploi */}
      {nbHorsEmploi > 0 && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg text-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-medium">
              Vous avez {nbHorsEmploi} séance(s) déclarée(s) <strong>hors emploi du temps</strong>.
            </p>
            <p className="text-xs mt-1">
              Ces séances ne correspondent à aucun cours de votre emploi du temps. L&apos;administration
              les verra en rouge et devra les vérifier avant validation.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-3">➕ Déclarer une séance</h2>
        <form action={declarerSeance} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                name="date"
                type="date"
                required
                max={aujourdHui}
                defaultValue={aujourdHui}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                La date ne peut pas être dans le futur.
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Heures travaillées</label>
              <input
                name="heures"
                type="number"
                step="0.5"
                min="0.5"
                required
                placeholder="2"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Cours (recommandé)
            </label>
            <select name="coursId" className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">— Aucun cours associé —</option>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.matiere.nom} — {c.classe.nom} (jour {c.jourSemaine})
                </option>
              ))}
            </select>
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Si la séance ne correspond à aucun cours de votre emploi, elle sera marquée
              <span className="inline-block bg-red-100 text-red-800 px-1.5 py-0.5 rounded mx-1 text-xs">hors emploi</span>
              et signalée à l&apos;administration.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description (optionnel)</label>
            <input
              name="description"
              placeholder="Ex: Séance de soutien, remplacement..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            Déclarer la séance
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Historique</h2>
          <span className="text-sm text-gray-500">
            Total heures confirmées : <strong className="text-green-700">{totalConfirmees} h</strong>
          </span>
        </div>
        {seances.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Aucune séance déclarée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Cours</th>
                <th className="p-3 text-left">Heures déclarées</th>
                <th className="p-3 text-left">Heures validées</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Motif</th>
              </tr>
            </thead>
            <tbody>
              {seances.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t ${s.horsEmploi ? 'bg-red-50' : ''}`}
                >
                  <td className="p-3">{s.date.toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    {s.cours ? (
                      <span className={s.horsEmploi ? 'text-red-700' : 'text-gray-700'}>
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
                  </td>
                  <td className={`p-3 ${s.horsEmploi ? 'text-red-700 font-medium' : ''}`}>
                    {s.heuresDeclarees} h
                  </td>
                  <td className="p-3">
                    {s.heuresValidees != null ? `${s.heuresValidees} h` : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutBadge(s.statut)}`}>
                      {statutLabel(s.statut)}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-red-600">{s.motifRejet ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}