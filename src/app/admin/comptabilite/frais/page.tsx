import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function creerFrais(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const eleveId = formData.get('eleveId') as string;
  const montantMensuel = parseFloat(formData.get('montantMensuel') as string);
  const description = formData.get('description') as string;

  if (!eleveId || isNaN(montantMensuel) || montantMensuel <= 0) return;

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const anneeScolaire = config.anneeScolaireCourante;

  // ⭐ Vérification : l'année scolaire doit exister
  if (!anneeScolaire) {
    throw new Error('Année scolaire non configurée. Allez dans /admin/configuration pour la définir.');
  }

  await db.fraisScolarite.upsert({
    where: { eleveId_anneeScolaire: { eleveId, anneeScolaire } },
    update: { montantMensuel, description: description || null },
    create: {
      eleveId,
      anneeScolaire,  // maintenant garanti string
      montantMensuel,
      description: description || null,
    },
  });

  revalidatePath('/admin/comptabilite');
  redirect('/admin/comptabilite');
}

export default async function FraisPage({
  searchParams,
}: {
  searchParams: Promise<{ eleveId?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();

  const eleves = await db.user.findMany({
    where: { role: 'ETUDIANT', actif: true },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: { nom: 'asc' },
  });

  const fraisExistants = await db.fraisScolarite.findMany({
    where: { anneeScolaire: config.anneeScolaireCourante },
    select: { eleveId: true },
  });
  const elevesAvecFrais = new Set(fraisExistants.map((f) => f.eleveId));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Frais mensuels — {config.anneeScolaireCourante}</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <form action={creerFrais} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Élève</label>
            <select name="eleveId" defaultValue={params.eleveId ?? ''} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Sélectionner un élève</option>
              {eleves.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom} {elevesAvecFrais.has(e.id) ? '(déjà défini)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Montant mensuel (DT)</label>
            <input name="montantMensuel" type="number" step="0.01" min="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description (optionnel)</label>
            <input name="description" placeholder="Frais mensuels" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}