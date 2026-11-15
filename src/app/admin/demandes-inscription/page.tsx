import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

async function approuver(id: string) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const demande = await db.demandeInscription.findUnique({ where: { id } });

  if (!demande || demande.statut !== 'EN_ATTENTE') {
    redirect('/admin/demandes-inscription');
  }

  // Mot de passe temporaire
  const motDePasseTemporaire = Math.random().toString(36).slice(-8) + 'A1!';
  const hash = await bcrypt.hash(motDePasseTemporaire, 10);

  // Email unique
  const baseEmail = `${demande.prenom.toLowerCase()}.${demande.nom.toLowerCase()}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

  let emailEtudiant = `${baseEmail}@ecole.tn`;
  let suffixe = 1;
  while (await db.user.findUnique({ where: { email: emailEtudiant } })) {
    emailEtudiant = `${baseEmail}${suffixe}@ecole.tn`;
    suffixe++;
  }

  try {
    await db.$transaction(async (tx) => {
      const etudiant = await tx.user.create({
        data: {
          email: emailEtudiant,
          motDePasse: hash,
          nom: demande.nom,
          prenom: demande.prenom,
          role: 'ETUDIANT',
          actif: true,
          emailParent: demande.emailParent,
        },
      });

      const classe = await tx.classe.findFirst({
        where: { nom: demande.classeDemandee },
      });
      if (!classe) {
        throw new Error(`Classe "${demande.classeDemandee}" introuvable`);
      }

      await tx.inscription.create({
        data: {
          etudiantId: etudiant.id,
          classeId: classe.id,
          anneeScolaire: classe.anneeScolaire,
        },
      });

      await tx.demandeInscription.update({
        where: { id },
        data: { statut: 'APPROUVEE', etudiantId: etudiant.id },
      });
    });

    // Email best-effort
    try {
      const config = await getConfig();
      if (config.resendApiKey && config.emailFrom) {
        const resend = new Resend(config.resendApiKey);
        await resend.emails.send({
          from: config.emailFrom,
          to: demande.emailParent,
          subject: 'Inscription validée — Identifiants de connexion',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Inscription validée !</h2>
              <p>Le compte de <strong>${demande.prenom} ${demande.nom}</strong>
              a été créé et inscrit en classe de <strong>${demande.classeDemandee}</strong>.</p>
              <p><strong>Email :</strong> ${emailEtudiant}</p>
              <p><strong>Mot de passe temporaire :</strong> ${motDePasseTemporaire}</p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error('[APPROBATION] Erreur email:', e);
    }
  } catch (e) {
    console.error('[APPROBATION] Erreur:', e);
  }

  revalidatePath('/admin/demandes-inscription');
  redirect('/admin/demandes-inscription');
}

async function rejeter(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const id = formData.get('id') as string;
  const motif = (formData.get('motif') as string) || 'Non spécifié';

  const db = await getPrismaDynamic();
  await db.demandeInscription.update({
    where: { id },
    data: { statut: 'REJETEE', motifRejet: motif },
  });

  revalidatePath('/admin/demandes-inscription');
  redirect('/admin/demandes-inscription');
}

export default async function AdminDemandesInscriptionPage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const demandes = await db.demandeInscription.findMany({
    where: { statut: 'EN_ATTENTE' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📝 Demandes de pré-inscription</h1>
      <p className="text-gray-500">{demandes.length} demande(s) en attente</p>

      {demandes.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center text-gray-500">
          Aucune demande en attente.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">Élève</th>
                <th className="p-3 text-left">Parent</th>
                <th className="p-3 text-left">Classe</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{d.prenom} {d.nom}</td>
                  <td className="p-3">
                    {d.emailParent}
                    <br />
                    <span className="text-gray-400">{d.telephone}</span>
                  </td>
                  <td className="p-3">{d.classeDemandee}</td>
                  <td className="p-3 text-gray-500">
                    {d.createdAt.toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 items-start">
                      <form action={approuver.bind(null, d.id)}>
                        <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                          ✅ Approuver
                        </button>
                      </form>
                      <form action={rejeter} className="flex gap-1 items-center">
                        <input type="hidden" name="id" value={d.id} />
                        <input
                          name="motif"
                          placeholder="Motif..."
                          className="border rounded px-2 py-1 text-xs w-24"
                        />
                        <button className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">
                          ❌ Rejeter
                        </button>
                      </form>
                    </div>
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