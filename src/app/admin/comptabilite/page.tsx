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

export default async function ComptabilitePage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const annee = config.anneeScolaireCourante;

  const inscriptions = await db.inscription.findMany({
    where: { anneeScolaire: annee },
    include: {
      etudiant: { select: { id: true, nom: true, prenom: true, email: true } },
    },
  });

  const eleveIds = inscriptions.map((i) => i.etudiant.id);
  const frais = await db.fraisScolarite.findMany({
    where: { eleveId: { in: eleveIds }, anneeScolaire: annee },
    include: { paiements: true },
  });
  const fraisParEleve = new Map(frais.map((f) => [f.eleveId, f]));

  const lignes = inscriptions.map((i) => {
    const f = fraisParEleve.get(i.etudiant.id);
    const paiements = f?.paiements ?? [];
    const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
    const moisPayes = new Set(paiements.map((p) => p.mois));
    const totalAttendu = f ? f.montantMensuel * 12 : 0;
    const reste = totalAttendu - totalPaye;

    return {
      eleve: i.etudiant,
      fraisId: f?.id,
      montantMensuel: f?.montantMensuel ?? 0,
      moisPayes,
      totalPaye,
      reste,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 Comptabilité — {annee}</h1>
        <Link
          href="/admin/comptabilite/frais"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          ⚙️ Gérer les frais
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 text-left sticky left-0 bg-gray-50">Élève</th>
              <th className="p-2 text-center">Mensuel</th>
              {MOIS.map((m) => (
                <th key={m} className="p-2 text-center">{MOIS_LABELS[m]}</th>
              ))}
              <th className="p-2 text-center">Reste</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.eleve.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium sticky left-0 bg-white">
                  {l.eleve.prenom} {l.eleve.nom}
                </td>
                <td className="p-2 text-center">{l.montantMensuel} DT</td>
                {MOIS.map((m) => (
                  <td key={m} className="p-2 text-center">
                    {l.moisPayes.has(m as any) ? '✅' : '❌'}
                  </td>
                ))}
                <td className={`p-2 text-center font-medium ${l.reste > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {l.reste.toFixed(0)} DT
                </td>
                <td className="p-2 text-center">
                  {l.fraisId ? (
                    <Link href={`/admin/comptabilite/paiements/${l.fraisId}`} className="text-blue-600 hover:underline">
                      💳
                    </Link>
                  ) : (
                    <Link href={`/admin/comptabilite/frais?eleveId=${l.eleve.id}`} className="text-amber-600 hover:underline">
                      ➕
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}