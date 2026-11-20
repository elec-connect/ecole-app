import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { withAdminOrSuper } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

export const PATCH = withAdminOrSuper(async (req, _session, ctx) => {
  const { id } = await ctx.params;
  const { action, motifRejet } = await req.json();

  if (!['approuver', 'rejeter'].includes(action)) {
    return NextResponse.json({ erreur: 'Action invalide' }, { status: 400 });
  }

  const db = await getPrismaDynamic();

  const demande = await db.demandeInscription.findUnique({ where: { id } });
  if (!demande) {
    return NextResponse.json({ erreur: 'Demande introuvable' }, { status: 404 });
  }
  if (demande.statut !== 'EN_ATTENTE') {
    return NextResponse.json(
      { erreur: 'Cette demande a déjà été traitée' },
      { status: 409 }
    );
  }

  // ============================
  // CAS 1 : REJET
  // ============================
  if (action === 'rejeter') {
    await db.demandeInscription.update({
      where: { id },
      data: { statut: 'REJETEE', motifRejet: motifRejet ?? 'Non spécifié' },
    });
    return NextResponse.json({ ok: true, statut: 'REJETEE' });
  }

  // ============================
  // CAS 2 : APPROBATION
  // ============================
  const config = await getConfig();
  const anneeScolaire = config.anneeScolaireCourante;
  
  // ⭐ Récupérer l'URL de base de l'application (dynamique)
  const appUrl = (config as any).appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Chercher une classe dont le niveau correspond, dans l'année courante en priorité
  let classe = await db.classe.findFirst({
    where: { niveau: demande.niveauDemande, anneeScolaire },
    orderBy: { nom: 'asc' },
  });

  if (!classe) {
    // Fallback : première classe de ce niveau, toutes années confondues
    classe = await db.classe.findFirst({
      where: { niveau: demande.niveauDemande },
      orderBy: { nom: 'asc' },
    });
  }

  if (!classe) {
    return NextResponse.json(
      {
        erreur: `Aucune classe n'existe pour le niveau "${demande.niveauDemande}". Créez-la d'abord dans /admin/classes.`,
      },
      { status: 400 }
    );
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
    const result = await db.$transaction(async (tx) => {
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

      await tx.inscription.create({
        data: {
          etudiantId: etudiant.id,
          classeId: classe!.id,
          anneeScolaire: classe!.anneeScolaire,
        },
      });

      await tx.demandeInscription.update({
        where: { id },
        data: { statut: 'APPROUVEE', etudiantId: etudiant.id },
      });

      return { etudiant, emailEtudiant, motDePasseTemporaire, classe };
    });

    // Email identifiants (best effort)
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
              <p>Le compte de <strong>${demande.prenom} ${demande.nom}</strong>
              a été créé et inscrit en classe de <strong>${result.classe!.nom}</strong>.</p>
              <p><strong>Email de connexion :</strong> ${result.emailEtudiant}</p>
              <p><strong>Mot de passe temporaire :</strong> ${result.motDePasseTemporaire}</p>
              <p>Connectez-vous sur <a href="${appUrl}/login">${appUrl}/login</a></p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error('[APPROBATION] Erreur email:', e);
    }

    return NextResponse.json({
      ok: true,
      statut: 'APPROUVEE',
      emailEtudiant: result.emailEtudiant,
      motDePasseTemporaire: result.motDePasseTemporaire,
    });
  } catch (e: any) {
    console.error('[APPROBATION] Erreur:', e);
    return NextResponse.json(
      { erreur: e.message || 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }
});