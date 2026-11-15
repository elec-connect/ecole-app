import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

export default async function ComptabiliteProfesseursPage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const annee = config.anneeScolaireCourante;
  if (!annee) redirect('/admin/configuration');

  const professeurs = await db.user.findMany({
    where: { role: 'PROFESSEUR', actif: true },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: { nom: 'asc' },
  });

  const tarifs = await db.tarifProfesseur.findMany({
    where: { anneeScolaire: annee },
    include: { paiements: true },
  });
  const tarifParProf = new Map(tarifs.map((t) => [t.professeurId, t]));

  const lignes = professeurs.map((p) => {
    const t = tarifParProf.get(p.id);
    const paiements = t?.paiements ?? [];
    const moisPayes = new Map(paiements.map((pay) => [pay.mois, pay]));
    const totalPaye = paiements.reduce((s, pay) => s + pay.montant, 0);
    const totalHeures = paiements.reduce((s, pay) => s + pay.heuresTravaillees, 0);
    return {
      prof: p,
      tarifId: t?.id,
      tauxHoraire: t?.tauxHoraire ?? 0,
      moisPayes,
      totalPaye,
      totalHeures,
    };
  });

  const nbAvecTarif = lignes.filter((l) => l.tauxHoraire > 0).length;
  const totalMasseSalariale = lignes.reduce((s, l) => s + l.totalPaye, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/comptabilite" className="text-sm text-blue-600 hover:underline">
        ← Retour à la comptabilité
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">👨‍🏫 Professeurs — paie mensuelle</h1>
          <p className="text-sm text-gray-500">Année {annee}</p>
        </div>
        <Link
          href="/admin/comptabilite/tarifs-professeurs"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
        >
          ⚙️ Gérer les taux horaires
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Professeurs actifs</p>
          <p className="text-2xl font-bold">{lignes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Taux définis</p>
          <p className="text-2xl font-bold text-green-600">{nbAvecTarif} / {lignes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Masse salariale payée</p>
          <p className="text-2xl font-bold text-purple-700">{totalMasseSalariale.toFixed(0)} DT</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {lignes.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">Aucun professeur actif.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-gray-50">Professeur</th>
                <th className="p-2 text-center">Taux/h</th>
                {MOIS.map((m) => (
                  <th key={m} className="p-2 text-center">{MOIS_LABELS[m]}</th>
                ))}
                <th className="p-2 text-center">Total payé</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.prof.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium sticky left-0 bg-white">
                    {l.prof.prenom} {l.prof.nom}
                  </td>
                  <td className="p-2 text-center">
                    {l.tauxHoraire > 0 ? (
                      `${l.tauxHoraire} DT`
                    ) : (
                      <span className="text-amber-600">Non défini</span>
                    )}
                  </td>
                  {MOIS.map((m) => (
                    <td key={m} className="p-2 text-center">
                      {l.moisPayes.has(m as any) ? '✅' : '❌'}
                    </td>
                  ))}
                  <td className="p-2 text-center font-medium text-purple-700">
                    {l.totalPaye.toFixed(0)} DT
                  </td>
                  <td className="p-2 text-center">
                    {l.tarifId ? (
                      <Link href={`/admin/comptabilite/paie-prof/${l.tarifId}`} className="text-purple-600 hover:underline">
                        💳
                      </Link>
                    ) : (
                      <Link href={`/admin/comptabilite/tarifs-professeurs?profId=${l.prof.id}`} className="text-amber-600 hover:underline">
                        ➕
                      </Link>
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