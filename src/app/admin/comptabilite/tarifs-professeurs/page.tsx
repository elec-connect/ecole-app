import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function definirTarif(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const professeurId = formData.get('professeurId') as string;
  const tauxHoraire = parseFloat(formData.get('tauxHoraire') as string);
  if (!professeurId || isNaN(tauxHoraire) || tauxHoraire <= 0) return;

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const anneeScolaire = config.anneeScolaireCourante;
  if (!anneeScolaire) throw new Error('Année scolaire non configurée');

  await db.tarifProfesseur.upsert({
    where: { professeurId_anneeScolaire: { professeurId, anneeScolaire } },
    update: { tauxHoraire },
    create: { professeurId, anneeScolaire, tauxHoraire },
  });

  revalidatePath('/admin/comptabilite/tarifs-professeurs');
  revalidatePath('/admin/comptabilite');
  redirect('/admin/comptabilite/tarifs-professeurs');
}

export default async function TarifsProfesseursPage({
  searchParams,
}: {
  searchParams: Promise<{ profId?: string }>;
}) {
  const params = await searchParams;
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
  });
  const tarifParProf = new Map(tarifs.map((t) => [t.professeurId, t]));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/comptabilite" className="text-sm text-blue-600 hover:underline">
        ← Retour à la comptabilité
      </Link>

      <h1 className="text-2xl font-bold">⚙️ Taux horaires — {annee}</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <form action={definirTarif} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Professeur</label>
            <select
              name="professeurId"
              defaultValue={params.profId ?? ''}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sélectionner un professeur</option>
              {professeurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prenom} {p.nom} {tarifParProf.has(p.id) ? `(actuel : ${tarifParProf.get(p.id)!.tauxHoraire} DT/h)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Taux horaire (DT/heure)</label>
            <input
              name="tauxHoraire"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm">
            Enregistrer
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <h2 className="font-semibold p-4 border-b">Taux actuels</h2>
        {professeurs.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Aucun professeur.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Professeur</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Taux horaire</th>
              </tr>
            </thead>
            <tbody>
              {professeurs.map((p) => {
                const t = tarifParProf.get(p.id);
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.prenom} {p.nom}</td>
                    <td className="p-3 text-gray-500">{p.email}</td>
                    <td className="p-3 text-center">
                      {t ? `${t.tauxHoraire} DT/h` : <span className="text-amber-600">Non défini</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}