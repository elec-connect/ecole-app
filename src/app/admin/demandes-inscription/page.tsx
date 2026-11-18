import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const NIVEAUX_LABELS: Record<string, string> = {
  // Primaire
  '1ere_primaire': '1ère année primaire',
  '2eme_primaire': '2ème année primaire',
  '3eme_primaire': '3ème année primaire',
  '4eme_primaire': '4ème année primaire',
  '5eme_primaire': '5ème année primaire',
  '6eme_primaire': '6ème année primaire',
  // Secondaire
  '7eme': '7ème année',
  '8eme': '8ème année',
  '9eme': '9ème année',
  '1ere': '1ère année secondaire',
  '2eme': '2ème année secondaire',
  '3eme': '3ème année secondaire',
  '4eme': '4ème année secondaire',
};

// Petit label (sans "année") pour construire le nom de la classe
const NIVEAUX_COURTS: Record<string, string> = {
  '1ere_primaire': '1ère primaire',
  '2eme_primaire': '2ème primaire',
  '3eme_primaire': '3ème primaire',
  '4eme_primaire': '4ème primaire',
  '5eme_primaire': '5ème primaire',
  '6eme_primaire': '6ème primaire',
  '7eme': '7ème',
  '8eme': '8ème',
  '9eme': '9ème',
  '1ere': '1ère',
  '2eme': '2ème',
  '3eme': '3ème',
  '4eme': '4ème',
};

const CAPACITE_MAX = 30;
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

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

  const config = await getConfig();
  const appUrl = (config as any).appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const anneeScolaire = config.anneeScolaireCourante;
  if (!anneeScolaire) {
    redirect('/admin/demandes-inscription?erreur=annee-manquante');
  }

  // ============================================================
  // ⭐ TROUVER OU CRÉER LA CLASSE
  // ============================================================
  
  // 1. Récupérer toutes les classes existantes pour ce niveau
  const classesDuNiveau = await db.classe.findMany({
    where: { 
      niveau: demande.niveauDemande, 
      anneeScolaire 
    },
    include: {
      _count: { select: { inscriptions: true } },
    },
    orderBy: { nom: 'asc' }, // A, B, C, D, E...
  });

  let classe;

  if (classesDuNiveau.length === 0) {
    // ⭐ Aucune classe n'existe → créer la section A automatiquement
    const niveauCourt = NIVEAUX_COURTS[demande.niveauDemande] ?? demande.niveauDemande;
    classe = await db.classe.create({
      data: {
        nom: `${niveauCourt} A`,
        niveau: demande.niveauDemande,
        anneeScolaire,
      },
      include: { _count: { select: { inscriptions: true } } },
    });
    console.log(`[APPROBATION] Classe créée automatiquement : ${classe.nom}`);
  } else {
    // 2. Chercher la première classe qui n'est pas pleine
    classe = classesDuNiveau.find(c => c._count.inscriptions < CAPACITE_MAX);

    // 3. Si toutes les classes sont pleines → créer une nouvelle section
    if (!classe) {
      const sectionsUtilisees = classesDuNiveau.map(c => {
        const parts = c.nom.split(' ');
        return parts[parts.length - 1]; // Dernière partie = la section (A, B, C...)
      });

      // Trouver la première section libre
      const sectionLibre = SECTIONS.find(s => !sectionsUtilisees.includes(s));

      if (!sectionLibre) {
        redirect('/admin/demandes-inscription?erreur=classes-pleines');
      }

      const niveauCourt = NIVEAUX_COURTS[demande.niveauDemande] ?? demande.niveauDemande;
      classe = await db.classe.create({
        data: {
          nom: `${niveauCourt} ${sectionLibre}`,
          niveau: demande.niveauDemande,
          anneeScolaire,
        },
        include: { _count: { select: { inscriptions: true } } },
      });
      console.log(`[APPROBATION] Nouvelle section créée automatiquement : ${classe.nom}`);
    }
  }

  // ============================================================
  // GÉNÉRATION DES IDENTIFIANTS
  // ============================================================
  const mdpEleve = Math.random().toString(36).slice(-8) + 'A1!';
  const mdpParent = Math.random().toString(36).slice(-8) + 'A1!';
  const hashEleve = await bcrypt.hash(mdpEleve, 10);
  const hashParent = await bcrypt.hash(mdpParent, 10);

  try {
    await db.$transaction(async (tx) => {
      // 1. Gérer le parent
      let parent = await tx.user.findUnique({
        where: { email: demande.emailParent },
      });

      if (!parent) {
        parent = await tx.user.create({
          data: {
            email: demande.emailParent,
            motDePasse: hashParent,
            nom: demande.nomParent,
            prenom: demande.prenomParent,
            role: 'PARENT',
            actif: true,
          },
        });
      } else {
        parent = await tx.user.update({
          where: { id: parent.id },
          data: { actif: true },
        });
      }

      // 2. Gérer l'élève
      let etudiant = await tx.user.findUnique({
        where: { email: demande.emailEleve },
      });

      if (!etudiant) {
        etudiant = await tx.user.create({
          data: {
            email: demande.emailEleve,
            motDePasse: hashEleve,
            nom: demande.nom,
            prenom: demande.prenom,
            role: 'ETUDIANT',
            actif: true,
            emailParent: demande.emailParent,
          },
        });
      } else {
        etudiant = await tx.user.update({
          where: { id: etudiant.id },
          data: {
            nom: demande.nom,
            prenom: demande.prenom,
            emailParent: demande.emailParent,
            actif: true,
          },
        });
      }

      // 3. Lier le parent à l'élève
      const lienExistant = await tx.parentEleve.findUnique({
        where: {
          parentId_eleveId: { parentId: parent.id, eleveId: etudiant.id },
        },
      });

      if (!lienExistant) {
        await tx.parentEleve.create({
          data: {
            parentId: parent.id,
            eleveId: etudiant.id,
            relation: 'parent',
          },
        });
      }

      // 4. Inscrire l'élève
      const inscriptionExistante = await tx.inscription.findFirst({
        where: {
          etudiantId: etudiant.id,
          classeId: classe!.id,
          anneeScolaire: classe!.anneeScolaire,
        },
      });

      if (!inscriptionExistante) {
        await tx.inscription.create({
          data: {
            etudiantId: etudiant.id,
            classeId: classe!.id,
            anneeScolaire: classe!.anneeScolaire,
          },
        });
      }

      // 5. Marquer la demande comme approuvée
      await tx.demandeInscription.update({
        where: { id },
        data: {
          statut: 'APPROUVEE',
          etudiantId: etudiant.id,
          parentId: parent.id,
        },
      });
    });

    // 6. Envoyer l'email
    try {
      if (config.resendApiKey && config.emailFrom) {
        const resend = new Resend(config.resendApiKey);
        await resend.emails.send({
          from: config.emailFrom,
          to: demande.emailParent,
          subject: 'Inscription validée — Identifiants de connexion',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Inscription validée !</h2>
              <p>Le compte de <strong>${demande.prenom} ${demande.nom}</strong> a été créé et inscrit en <strong>${classe!.nom}</strong>.</p>

              <h3>👦 Élève</h3>
              <p><strong>Email :</strong> ${demande.emailEleve}<br/>
              <strong>Mot de passe :</strong> ${mdpEleve}</p>

              <h3>👨‍👩‍👦 Parent</h3>
              <p><strong>Email :</strong> ${demande.emailParent}<br/>
              <strong>Mot de passe :</strong> ${mdpParent}</p>

              <p>Connectez-vous sur <a href="${appUrl}/login">${appUrl}/login</a></p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error('[APPROBATION] Erreur email:', e);
    }

  } catch (e: any) {
    console.error('[APPROBATION] Erreur:', e);
    redirect('/admin/demandes-inscription?erreur=creation-compte');
  }

  revalidatePath('/admin/demandes-inscription');
  redirect('/admin/demandes-inscription?success=1');
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

export default async function AdminDemandesInscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; success?: string }>;
}) {
  const params = await searchParams;

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

      {params.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm">
          ✅ Demande traitée avec succès. Les identifiants élève et parent ont été envoyés par email.
        </div>
      )}

      {params.erreur === 'classes-pleines' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          ❌ Toutes les classes de ce niveau sont pleines (30 élèves maximum par classe) et les sections A-M sont épuisées.
          Créez manuellement une nouvelle classe dans{' '}
          <a href="/admin/classes" className="underline font-medium">/admin/classes</a>.
        </div>
      )}

      {params.erreur === 'creation-compte' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          ❌ Erreur lors de la création des comptes. Vérifiez les logs serveur ou assurez-vous que l'email de l'élève n'est pas déjà utilisé.
        </div>
      )}

      {params.erreur === 'annee-manquante' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          ❌ Année scolaire non configurée. Allez dans <a href="/admin/configuration" className="underline">/admin/configuration</a>.
        </div>
      )}

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
                <th className="p-3 text-left">Niveau</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{d.prenom} {d.nom}</div>
                    <div className="text-xs text-gray-500">{d.emailEleve}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{d.prenomParent} {d.nomParent}</div>
                    <div className="text-xs text-gray-500">{d.emailParent}</div>
                    <div className="text-xs text-gray-400">{d.telephone}</div>
                  </td>
                  <td className="p-3">{NIVEAUX_LABELS[d.niveauDemande] ?? d.niveauDemande}</td>
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