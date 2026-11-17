import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const MOIS = [
  'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE',
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL',
  'MAI', 'JUIN', 'JUILLET', 'AOUT',
] as const;

const MOIS_LABELS: Record<string, string> = {
  SEPTEMBRE: 'Septembre', OCTOBRE: 'Octobre', NOVEMBRE: 'Novembre', DECEMBRE: 'Décembre',
  JANVIER: 'Janvier', FEVRIER: 'Février', MARS: 'Mars', AVRIL: 'Avril',
  MAI: 'Mai', JUIN: 'Juin', JUILLET: 'Juillet', AOUT: 'Août',
};

// Correspondance entre mois calendaire (0 = janvier) et mois scolaire
// Scolaire : septembre = 0, octobre = 1, ..., août = 11
function moisScolaireDepuisDate(date: Date): (typeof MOIS)[number] {
  const moisCalendaire = date.getMonth(); // 0..11
  const idx = (moisCalendaire + 4) % 12;   // sept(8) -> 0, ..., août(7) -> 11
  return MOIS[idx];
}

async function enregistrerPaie(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const tarifId = formData.get('tarifId') as string;
  const mois = formData.get('mois') as string;
  const heures = parseFloat(formData.get('heures') as string);
  const payer = formData.get('payer') === 'on';

  if (!tarifId || isNaN(heures) || heures < 0) return;

  const db = await getPrismaDynamic();
  const tarif = await db.tarifProfesseur.findUnique({ where: { id: tarifId } });
  if (!tarif) return;

  const montant = heures * tarif.tauxHoraire;

  if (payer) {
    await db.paieProfesseur.upsert({
      where: { tarifId_mois: { tarifId, mois: mois as any } },
      update: { heuresTravaillees: heures, tauxHoraire: tarif.tauxHoraire, montant, statut: 'PAYE' },
      create: {
        tarifId,
        mois: mois as any,
        heuresTravaillees: heures,
        tauxHoraire: tarif.tauxHoraire,
        montant,
        statut: 'PAYE',
      },
    });
  } else {
    await db.paieProfesseur.deleteMany({
      where: { tarifId, mois: mois as any },
    });
  }

  revalidatePath(`/admin/comptabilite/paie-prof/${tarifId}`);
  revalidatePath('/admin/comptabilite');
}

export default async function PaieProfPage({
  params,
}: {
  params: Promise<{ tarifId: string }>;
}) {
  const { tarifId } = await params;
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const annee = config.anneeScolaireCourante;
  if (!annee) redirect('/admin/configuration');

  const tarif = await db.tarifProfesseur.findUnique({
    where: { id: tarifId },
    include: {
      professeur: { select: { id: true, nom: true, prenom: true, email: true } },
      paiements: true,
    },
  });

  if (!tarif) redirect('/admin/comptabilite');

  // ============================================================
  // Récupérer les séances CONFIRMÉES du prof pour l'année scolaire
  // ============================================================
  const [anneeDebut, anneeFin] = annee.split('-').map((s) => parseInt(s, 10));
  // Année scolaire : septembre anneeDebut → août anneeFin
  const dateDebut = new Date(anneeDebut, 8, 1);  // 1er septembre
  const dateFin   = new Date(anneeFin, 7, 31, 23, 59, 59); // 31 août

  const seancesConfirmees = await db.seanceTravail.findMany({
    where: {
      professeurId: tarif.professeur.id,
      statut: 'CONFIRMEE',
      date: { gte: dateDebut, lte: dateFin },
    },
    orderBy: { date: 'asc' },
  });

  // Agrégation des heures validées par mois scolaire
  const heuresParMois: Record<string, number> = {};
  const nbSeancesParMois: Record<string, number> = {};
  for (const s of seancesConfirmees) {
    const mois = moisScolaireDepuisDate(s.date);
    heuresParMois[mois] = (heuresParMois[mois] ?? 0) + (s.heuresValidees ?? 0);
    nbSeancesParMois[mois] = (nbSeancesParMois[mois] ?? 0) + 1;
  }

  // Map des paies existantes par mois
  const paiementsParMois = new Map(tarif.paiements.map((p) => [p.mois, p]));

  // Totaux
  const totalPaye = tarif.paiements.reduce((s, p) => s + p.montant, 0);
  const totalHeuresPayees = tarif.paiements.reduce((s, p) => s + p.heuresTravaillees, 0);

  const totalHeuresConfirmeesNonPayees = MOIS.reduce((sum, m) => {
    const paye = paiementsParMois.has(m);
    return paye ? sum : sum + (heuresParMois[m] ?? 0);
  }, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin/comptabilite" className="text-sm text-blue-600 hover:underline">
        ← Retour à la comptabilité
      </Link>

      {/* En-tête */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h1 className="text-xl font-bold">
          {tarif.professeur.prenom} {tarif.professeur.nom}
        </h1>
        <p className="text-sm text-gray-500">{tarif.professeur.email}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Taux horaire</p>
            <p className="text-lg font-bold">{tarif.tauxHoraire} DT</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Heures payées</p>
            <p className="text-lg font-bold text-purple-600">{totalHeuresPayees} h</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total payé</p>
            <p className="text-lg font-bold text-green-600">{totalPaye.toFixed(0)} DT</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Heures à payer</p>
            <p className={`text-lg font-bold ${totalHeuresConfirmeesNonPayees > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {totalHeuresConfirmeesNonPayees} h
            </p>
          </div>
        </div>
      </div>

      {/* Rappel séances confirmées */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
        💡 Les heures ci-dessous sont <strong>pré-remplies à partir des séances confirmées</strong> par
        l&apos;administration. Vous pouvez les ajuster avant d&apos;enregistrer la paie.
        {seancesConfirmees.length > 0 && (
          <span>
            {' '}
            ({seancesConfirmees.length} séance(s) confirmée(s) cette année)
          </span>
        )}
      </div>

      {/* Grille des mois */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-3">📅 Paie mensuelle — {annee}</h2>
        <div className="space-y-2">
          {MOIS.map((m) => {
            const paiement = paiementsParMois.get(m);
            const heuresConfirmees = heuresParMois[m] ?? 0;
            const nbSeances = nbSeancesParMois[m] ?? 0;
            const heuresAffichees = paiement?.heuresTravaillees ?? heuresConfirmees;

            return (
              <form key={m} action={enregistrerPaie} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input type="hidden" name="tarifId" value={tarifId} />
                <input type="hidden" name="mois" value={m} />

                <span className="w-24 font-medium text-sm">{MOIS_LABELS[m]}</span>

                <input
                  name="heures"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={heuresAffichees || ''}
                  placeholder="Heures"
                  className="w-24 border rounded px-2 py-1 text-sm"
                />

                <span className="text-sm text-gray-500 min-w-[120px]">
                  × {tarif.tauxHoraire} DT = {(heuresAffichees * tarif.tauxHoraire).toFixed(2)} DT
                </span>

                {nbSeances > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {nbSeances} séance{nbSeances > 1 ? 's' : ''} ({heuresConfirmees} h)
                  </span>
                )}

                <label className="flex items-center gap-1 text-sm ml-auto">
                  <input
                    type="checkbox"
                    name="payer"
                    defaultChecked={Boolean(paiement)}
                    className="w-4 h-4"
                  />
                  Payer
                </label>

                <button type="submit" className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700">
                  Enregistrer
                </button>

                {paiement && (
                  <Link
                    href={`/api/comptabilite/recu-prof/${paiement.id}`}
                    target="_blank"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    📄 Reçu
                  </Link>
                )}
              </form>
            );
          })}
        </div>
      </div>

      {/* Détail des séances confirmées */}
      {seancesConfirmees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <h2 className="font-semibold p-4 border-b">🔍 Détail des séances confirmées</h2>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Cours / Description</th>
                <th className="p-2 text-center">Heures déclarées</th>
                <th className="p-2 text-center">Heures validées</th>
              </tr>
            </thead>
            <tbody>
              {seancesConfirmees.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.date.toLocaleDateString('fr-FR')}</td>
                  <td className="p-2">{s.description ?? '—'}</td>
                  <td className="p-2 text-center">{s.heuresDeclarees} h</td>
                  <td className="p-2 text-center font-medium text-green-700">
                    {s.heuresValidees ?? '—'} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}