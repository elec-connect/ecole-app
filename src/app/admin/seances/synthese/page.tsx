import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Fragment } from 'react';

export const dynamic = 'force-dynamic';

const MOIS = [
  'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE',
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL',
  'MAI', 'JUIN', 'JUILLET', 'AOUT',
] as const;

const MOIS_LABELS: Record<string, string> = {
  SEPTEMBRE: 'Sep', OCTOBRE: 'Oct', NOVEMBRE: 'Nov', DECEMBRE: 'Déc',
  JANVIER: 'Jan', FEVRIER: 'Fév', MARS: 'Mar', AVRIL: 'Avr',
  MAI: 'Mai', JUIN: 'Juin', JUILLET: 'Juil', AOUT: 'Août',
};

// Convertit une date en mois scolaire (septembre = 0, ..., août = 11)
function moisScolaireDepuisDate(date: Date): (typeof MOIS)[number] {
  const moisCalendaire = date.getMonth(); // 0..11
  const idx = (moisCalendaire + 4) % 12;
  return MOIS[idx];
}

export default async function SyntheseSeancesPage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const annee = config.anneeScolaireCourante;
  if (!annee) redirect('/admin/configuration');

  const [anneeDebut, anneeFin] = annee.split('-').map((s) => parseInt(s, 10));
  const dateDebut = new Date(anneeDebut, 8, 1);
  const dateFin = new Date(anneeFin, 7, 31, 23, 59, 59);

  // 1. Récupérer tous les professeurs actifs
  const professeurs = await db.user.findMany({
    where: { role: 'PROFESSEUR', actif: true },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: { nom: 'asc' },
  });

  // 2. Récupérer toutes les séances de l'année (toutes statuts)
  const seances = await db.seanceTravail.findMany({
    where: {
      date: { gte: dateDebut, lte: dateFin },
    },
    select: {
      professeurId: true,
      date: true,
      heuresDeclarees: true,
      heuresValidees: true,
      statut: true,
    },
  });

  // 3. Récupérer les paies de l'année
  const paies = await db.paieProfesseur.findMany({
    where: { tarif: { anneeScolaire: annee } },
    select: {
      mois: true,
      heuresTravaillees: true,
      montant: true,
      tarif: { select: { professeurId: true } },
    },
  });

  // 4. Agréger par professeur → par mois
  type MoisStats = {
    declarees: number;
    confirmees: number;
    payees: number;
    montantPaye: number;
    nbSeances: number;
    nbEnAttente: number;
    nbRejetees: number;
  };

  const statsParProf = new Map<string, Map<string, MoisStats>>();

  for (const prof of professeurs) {
    statsParProf.set(prof.id, new Map());
  }

  for (const s of seances) {
    const mois = moisScolaireDepuisDate(s.date);
    const profMap = statsParProf.get(s.professeurId);
    if (!profMap) continue;

    if (!profMap.has(mois)) {
      profMap.set(mois, {
        declarees: 0, confirmees: 0, payees: 0,
        montantPaye: 0, nbSeances: 0, nbEnAttente: 0, nbRejetees: 0,
      });
    }
    const m = profMap.get(mois)!;
    m.declarees += s.heuresDeclarees;
    m.nbSeances += 1;
    if (s.statut === 'CONFIRMEE') {
      m.confirmees += s.heuresValidees ?? 0;
    } else if (s.statut === 'EN_ATTENTE') {
      m.nbEnAttente += 1;
    } else if (s.statut === 'REJETEE') {
      m.nbRejetees += 1;
    }
  }

  for (const p of paies) {
    const profMap = statsParProf.get(p.tarif.professeurId);
    if (!profMap) continue;
    const mois = p.mois as string;
    if (!profMap.has(mois)) {
      profMap.set(mois, {
        declarees: 0, confirmees: 0, payees: 0,
        montantPaye: 0, nbSeances: 0, nbEnAttente: 0, nbRejetees: 0,
      });
    }
    const m = profMap.get(mois)!;
    m.payees += p.heuresTravaillees;
    m.montantPaye += p.montant;
  }

  // 5. Calcul des totaux globaux
  let totalGlobalDeclarees = 0;
  let totalGlobalConfirmees = 0;
  let totalGlobalPayees = 0;
  let totalGlobalMontant = 0;

  for (const profMap of statsParProf.values()) {
    for (const m of profMap.values()) {
      totalGlobalDeclarees += m.declarees;
      totalGlobalConfirmees += m.confirmees;
      totalGlobalPayees += m.payees;
      totalGlobalMontant += m.montantPaye;
    }
  }

  // 6. Lignes du tableau : une par professeur, avec sous-totaux
  const lignes = professeurs.map((prof) => {
    const profMap = statsParProf.get(prof.id)!;
    const moisData = MOIS.map((m) => {
      const s = profMap.get(m);
      return {
        mois: m,
        declarees: s?.declarees ?? 0,
        confirmees: s?.confirmees ?? 0,
        payees: s?.payees ?? 0,
        montantPaye: s?.montantPaye ?? 0,
        nbEnAttente: s?.nbEnAttente ?? 0,
        nbRejetees: s?.nbRejetees ?? 0,
      };
    });

    const totaux = moisData.reduce(
      (acc, m) => ({
        declarees: acc.declarees + m.declarees,
        confirmees: acc.confirmees + m.confirmees,
        payees: acc.payees + m.payees,
        montantPaye: acc.montantPaye + m.montantPaye,
      }),
      { declarees: 0, confirmees: 0, payees: 0, montantPaye: 0 }
    );

    return { prof, moisData, totaux };
  });

  // Fonction utilitaire : écart entre confirmées et payées
  const ecartColor = (confirmees: number, payees: number) => {
    const diff = confirmees - payees;
    if (Math.abs(diff) < 0.01) return 'text-gray-500';
    if (diff > 0) return 'text-amber-600 font-semibold'; // à payer
    return 'text-red-600 font-semibold'; // payé en trop
  };

  const ecartLabel = (confirmees: number, payees: number) => {
    const diff = confirmees - payees;
    if (Math.abs(diff) < 0.01) return '—';
    if (diff > 0) return `+${diff.toFixed(1)} h à payer`;
    return `${diff.toFixed(1)} h trop payé`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Synthèse des séances — {annee}</h1>
          <p className="text-sm text-gray-500">
            Heures déclarées / confirmées / payées par professeur et par mois.
          </p>
        </div>
        <Link href="/admin/seances" className="text-sm text-blue-600 hover:underline">
          ← Retour aux séances
        </Link>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Heures déclarées</p>
          <p className="text-2xl font-bold">{totalGlobalDeclarees.toFixed(0)} h</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Heures confirmées</p>
          <p className="text-2xl font-bold text-green-600">{totalGlobalConfirmees.toFixed(0)} h</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Heures payées</p>
          <p className="text-2xl font-bold text-purple-600">{totalGlobalPayees.toFixed(0)} h</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Masse salariale</p>
          <p className="text-2xl font-bold text-blue-700">{totalGlobalMontant.toFixed(0)} DT</p>
        </div>
      </div>

      {/* Tableau de synthèse */}
      {professeurs.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center text-gray-500">
          Aucun professeur actif.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-gray-50">Professeur</th>
                {MOIS.map((m) => (
                  <th key={m} className="p-2 text-center">{MOIS_LABELS[m]}</th>
                ))}
                <th className="p-2 text-center bg-gray-100">Total</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ prof, moisData, totaux }) => (
  <Fragment key={prof.id}>
    {/* Ligne heures déclarées */}
    <tr className="border-t">
      <td className="p-2 font-medium sticky left-0 bg-white">
        {prof.prenom} {prof.nom}
        <div className="text-xs font-normal text-gray-400">Déclarées</div>
      </td>
      {moisData.map((m) => (
        <td key={m.mois} className="p-2 text-center text-gray-600">
          {m.declarees > 0 ? `${m.declarees} h` : '—'}
          {m.nbEnAttente > 0 && (
            <div className="text-xs text-amber-600">⏳ {m.nbEnAttente}</div>
          )}
        </td>
      ))}
      <td className="p-2 text-center font-bold bg-gray-50">
        {totaux.declarees} h
      </td>
    </tr>

    {/* Ligne heures confirmées */}
    <tr>
      <td className="p-2 font-medium sticky left-0 bg-white">
        <span className="text-green-700">Confirmées</span>
      </td>
      {moisData.map((m) => (
        <td key={m.mois} className="p-2 text-center text-green-700">
          {m.confirmees > 0 ? `${m.confirmees} h` : '—'}
        </td>
      ))}
      <td className="p-2 text-center font-bold text-green-700 bg-gray-50">
        {totaux.confirmees} h
      </td>
    </tr>

    {/* Ligne heures payées + écart */}
    <tr className="border-b-2">
      <td className="p-2 font-medium sticky left-0 bg-white">
        <span className="text-purple-700">Payées</span>
      </td>
      {moisData.map((m) => {
        const ecart = m.confirmees - m.payees;
        const showEcart = Math.abs(ecart) >= 0.01;
        return (
          <td key={m.mois} className="p-2 text-center">
            <div className="text-purple-700">
              {m.payees > 0 ? `${m.payees} h` : '—'}
            </div>
            {showEcart && (
              <div className={`text-xs ${ecartColor(m.confirmees, m.payees)}`}>
                {ecartLabel(m.confirmees, m.payees)}
              </div>
            )}
            {m.montantPaye > 0 && (
              <div className="text-xs text-gray-400">
                {m.montantPaye.toFixed(0)} DT
              </div>
            )}
          </td>
        );
      })}
      <td className="p-2 text-center bg-gray-50">
        <div className="font-bold text-purple-700">{totaux.payees} h</div>
        <div className="text-xs text-gray-500">{totaux.montantPaye.toFixed(0)} DT</div>
        {Math.abs(totaux.confirmees - totaux.payees) >= 0.01 && (
          <div className={`text-xs ${ecartColor(totaux.confirmees, totaux.payees)}`}>
            {ecartLabel(totaux.confirmees, totaux.payees)}
          </div>
        )}
      </td>
    </tr>
  </Fragment>
))}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende */}
      <div className="bg-white p-4 rounded-xl shadow-sm border text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-sm mb-2">📖 Légende</p>
        <p><strong>Déclarées</strong> : total des heures saisies par le professeur (toutes séances).</p>
        <p><strong>Confirmées</strong> : total des heures validées par l&apos;admin (après contrôle).</p>
        <p><strong>Payées</strong> : total des heures effectivement payées (paie enregistrée).</p>
        <p>
          <span className="text-amber-600 font-semibold">+X h à payer</span> : heures confirmées
          non encore payées (écart positif).
        </p>
        <p>
          <span className="text-red-600 font-semibold">-X h trop payé</span> : heures payées
          en excès par rapport aux heures confirmées (écart négatif).
        </p>
        <p>
          <span className="text-amber-600">⏳ N</span> : nombre de séances en attente de validation
          pour ce mois.
        </p>
      </div>
    </div>
  );
}