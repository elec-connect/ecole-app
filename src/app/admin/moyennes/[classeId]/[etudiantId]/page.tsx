import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function enregistrerNote(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const noteId = formData.get('noteId') as string;
  const etudiantId = formData.get('etudiantId') as string;
  const matiereId = formData.get('matiereId') as string;
  const classeId = formData.get('classeId') as string;
  const valeur = parseFloat(formData.get('valeur') as string);
  const coefficient = parseInt(formData.get('coefficient') as string, 10);
  const commentaire = formData.get('commentaire') as string;

  if (!etudiantId || !matiereId || isNaN(valeur)) return;

  const db = await getPrismaDynamic();

  if (noteId) {
    await db.note.update({
      where: { id: noteId },
      data: { valeur, coefficient, commentaire: commentaire || null },
    });
  } else {
    await db.note.create({
      data: {
        etudiantId,
        matiereId,
        type: 'CONTROLE',
        valeur,
        coefficient,
        commentaire: commentaire || null,
        date: new Date(),
      },
    });
  }

  revalidatePath(`/admin/moyennes/${classeId}/${etudiantId}`);
  redirect(`/admin/moyennes/${classeId}/${etudiantId}?success=1`);
}

async function supprimerNote(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const noteId = formData.get('noteId') as string;
  const classeId = formData.get('classeId') as string;
  const etudiantId = formData.get('etudiantId') as string;

  if (!noteId) return;

  const db = await getPrismaDynamic();
  await db.note.delete({ where: { id: noteId } });

  revalidatePath(`/admin/moyennes/${classeId}/${etudiantId}`);
  redirect(`/admin/moyennes/${classeId}/${etudiantId}`);
}

export default async function EditNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ classeId: string; etudiantId: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const p = await params;
  const sp = await searchParams;

  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();

  const etudiant = await db.user.findUnique({
    where: { id: p.etudiantId },
    select: { id: true, nom: true, prenom: true },
  });

  const classe = await db.classe.findUnique({
    where: { id: p.classeId },
    include: {
      cours: {
        include: { matiere: true },
      },
    },
  });

  if (!etudiant || !classe) {
    redirect('/admin/moyennes');
  }

  // Récupérer toutes les matières de la classe (via les cours)
  const matieres = Array.from(
    new Map(classe.cours.map((c) => [c.matiere.id, c.matiere])).values()
  );

  // Récupérer toutes les notes de l'élève pour ces matières
  const notes = await db.note.findMany({
    where: {
      etudiantId: p.etudiantId,
      matiereId: { in: matieres.map((m) => m.id) },
    },
  });

  const notesParMatiere = new Map<string, any[]>();
  for (const n of notes) {
    if (!notesParMatiere.has(n.matiereId)) {
      notesParMatiere.set(n.matiereId, []);
    }
    notesParMatiere.get(n.matiereId)!.push(n);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={`/admin/moyennes/${p.classeId}`} className="text-sm text-blue-600 hover:underline">
        ← Retour à la classe {classe.nom}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ✏️ Éditer les notes de {etudiant.prenom} {etudiant.nom}
        </h1>
        <p className="text-gray-500 mt-1">Classe : {classe.nom}</p>
      </div>

      {sp.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm">
          ✅ Notes enregistrées avec succès.
        </div>
      )}

      {matieres.map((matiere) => {
        const notesMatiere = notesParMatiere.get(matiere.id) ?? [];
        const totalPoints = notesMatiere.reduce((sum, n) => sum + n.valeur * n.coefficient, 0);
        const totalCoef = notesMatiere.reduce((sum, n) => sum + n.coefficient, 0);
        const moyenne = totalCoef > 0 ? totalPoints / totalCoef : null;

        return (
          <div key={matiere.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{matiere.nom}</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Moyenne :</span>
                {moyenne !== null ? (
                  <span className={`font-bold ${moyenne >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {moyenne.toFixed(2)} / 20
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>

            {notesMatiere.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="p-2 text-left text-xs text-gray-500">Date</th>
                    <th className="p-2 text-left text-xs text-gray-500">Type</th>
                    <th className="p-2 text-center text-xs text-gray-500">Note /20</th>
                    <th className="p-2 text-center text-xs text-gray-500">Coef.</th>
                    <th className="p-2 text-left text-xs text-gray-500">Commentaire</th>
                    <th className="p-2 text-center text-xs text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notesMatiere.map((n) => (
                    <tr key={n.id}>
                      <td className="p-2 text-xs">{n.date.toLocaleDateString('fr-FR')}</td>
                      <td className="p-2 text-xs">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{n.type}</span>
                      </td>
                      <td colSpan={4} className="p-2">
                        <form action={enregistrerNote} className="flex items-center gap-2 flex-wrap">
                          <input type="hidden" name="noteId" value={n.id} />
                          <input type="hidden" name="etudiantId" value={p.etudiantId} />
                          <input type="hidden" name="matiereId" value={matiere.id} />
                          <input type="hidden" name="classeId" value={p.classeId} />
                          
                          <label className="text-xs text-gray-500">Note</label>
                          <input type="number" name="valeur" step="0.25" min="0" max="20" defaultValue={n.valeur} className="w-16 border rounded px-2 py-1 text-sm" />
                          
                          <label className="text-xs text-gray-500">Coef.</label>
                          <input type="number" name="coefficient" min="1" defaultValue={n.coefficient} className="w-12 border rounded px-2 py-1 text-sm" />
                          
                          <label className="text-xs text-gray-500">Comm.</label>
                          <input type="text" name="commentaire" defaultValue={n.commentaire ?? ''} className="flex-1 border rounded px-2 py-1 text-sm min-w-[100px]" />
                          
                          <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">💾 Enregistrer</button>
                        </form>
                        <form action={supprimerNote} className="mt-1">
                          <input type="hidden" name="noteId" value={n.id} />
                          <input type="hidden" name="classeId" value={p.classeId} />
                          <input type="hidden" name="etudiantId" value={p.etudiantId} />
                          <button type="submit" className="text-red-600 text-xs hover:underline">🗑️ Supprimer</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-sm text-gray-400">
                Aucune note pour cette matière.
              </div>
            )}

            {/* Formulaire d'ajout - TOUJOURS AFFICHÉ */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <form action={enregistrerNote} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="etudiantId" value={p.etudiantId} />
                <input type="hidden" name="matiereId" value={matiere.id} />
                <input type="hidden" name="classeId" value={p.classeId} />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Note /20</label>
                  <input type="number" name="valeur" step="0.25" min="0" max="20" required className="w-20 border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Coef.</label>
                  <input type="number" name="coefficient" min="1" defaultValue={1} required className="w-16 border rounded px-2 py-1 text-sm" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-gray-500 mb-1">Commentaire</label>
                  <input type="text" name="commentaire" className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-xs font-medium">
                  ➕ Ajouter
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}