import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
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

async function basculerPaiement(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const fraisId = formData.get('fraisId') as string;
  const mois = formData.get('mois') as string;
  const montant = parseFloat(formData.get('montant') as string);

  const db = await getPrismaDynamic();

  const existant = await db.paiement.findUnique({
    where: { fraisId_mois: { fraisId, mois: mois as any } },
  });

  if (existant) {
    await db.paiement.delete({ where: { id: existant.id } });
  } else {
    await db.paiement.create({
      data: {
        fraisId,
        mois: mois as any,
        montant,
        methode: 'espèces',
        statut: 'PAYE',
      },
    });
  }

  revalidatePath(`/admin/comptabilite/paiements/${fraisId}`);
  revalidatePath('/admin/comptabilite');
}

export default async function PaiementsPage({
  params,
}: {
  params: Promise<{ fraisId: string }>;
}) {
  const { fraisId } = await params;
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const frais = await db.fraisScolarite.findUnique({
    where: { id: fraisId },
    include: {
      eleve: { select: { nom: true, prenom: true, email: true } },
      paiements: true,
    },
  });

  if (!frais) redirect('/admin/comptabilite');

  const moisPayes = new Map(frais.paiements.map((p) => [p.mois, p]));
  const totalPaye = frais.paiements.reduce((s, p) => s + p.montant, 0);
  const totalAttendu = frais.montantMensuel * 12;
  const reste = totalAttendu - totalPaye;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/comptabilite" className="text-sm text-blue-600 hover:underline">
        ← Retour à la comptabilité
      </Link>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h1 className="text-xl font-bold">
          {frais.eleve.prenom} {frais.eleve.nom}
        </h1>
        <p className="text-sm text-gray-500">{frais.eleve.email}</p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Mensuel</p>
            <p className="text-lg font-bold">{frais.montantMensuel} DT</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Payé</p>
            <p className="text-lg font-bold text-green-600">{totalPaye.toFixed(0)} DT</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reste</p>
            <p className={`text-lg font-bold ${reste > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {reste.toFixed(0)} DT
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-3">📅 Paiements mensuels</h2>
        <p className="text-xs text-gray-500 mb-3">
          Cliquez sur un mois pour marquer comme payé / impayé. Un reçu PDF est généré automatiquement.
        </p>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {MOIS.map((m) => {
            const paiement = moisPayes.get(m);
            return (
              <form key={m} action={basculerPaiement}>
                <input type="hidden" name="fraisId" value={fraisId} />
                <input type="hidden" name="mois" value={m} />
                <input type="hidden" name="montant" value={frais.montantMensuel} />
                <button
                  type="submit"
                  className={`w-full p-3 rounded-lg text-xs font-medium transition ${
                    paiement
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <div className="font-bold">{MOIS_LABELS[m]}</div>
                  <div className="text-lg">{paiement ? '✅' : '❌'}</div>
                </button>
              </form>
            );
          })}
        </div>
      </div>

      {moisPayes.size > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="font-semibold mb-3">🧾 Reçus générés</h2>
          <div className="space-y-2">
            {Array.from(moisPayes.values()).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">
                  {MOIS_LABELS[p.mois]} — {p.montant} DT — {p.datePaiement.toLocaleDateString('fr-FR')}
                </span>
                <Link
                  href={`/api/comptabilite/recu/${p.id}`}
                  target="_blank"
                  className="text-blue-600 hover:underline text-xs font-medium"
                >
                  📄 Télécharger PDF
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}