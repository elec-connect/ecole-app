import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAuth, withProf } from '@/lib/api-helpers';
import { getConfig } from '@/lib/config';
import { StatutPresence } from '@prisma/client';
import { Resend } from 'resend';

export const POST = withProf(async (req) => {
  const { coursId, date, presences } = (await req.json()) as {
    coursId: string;
    date: string;
    presences: { etudiantId: string; statut: StatutPresence }[];
  };

  if (!coursId || !date || !Array.isArray(presences)) {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 400 });
  }

  const db = await getPrismaDynamic();
  const dateObj = new Date(date);

  // 1. Enregistrer les présences en base
  await db.$transaction(
    presences.map((p) =>
      db.presence.upsert({
        where: {
          coursId_etudiantId_date: { coursId, etudiantId: p.etudiantId, date: dateObj },
        },
        update: { statut: p.statut },
        create: { coursId, etudiantId: p.etudiantId, date: dateObj, statut: p.statut },
      })
    )
  );

  // 2. Envoyer un email aux parents des élèves ABSENTS (batch)
  try {
    const config = await getConfig();

    if (!config.resendApiKey || !config.emailFrom) {
      console.warn('[PRESENCE] Resend non configuré (clé API ou emailFrom manquant)');
      return NextResponse.json({ ok: true });
    }

    // Ne notifier que les élèves marqués ABSENT
    const absents = presences.filter((p) => p.statut === 'ABSENT');

    if (absents.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Récupérer les informations des élèves absents
    const etudiants = await db.user.findMany({
      where: { id: { in: absents.map((a) => a.etudiantId) } },
      select: { id: true, nom: true, prenom: true, emailParent: true },
    });

    // Récupérer les informations du cours (matière + classe)
    const cours = await db.cours.findUnique({
      where: { id: coursId },
      include: {
        matiere: { select: { nom: true } },
        classe: { select: { nom: true } },
      },
    });

    const matiereNom = cours?.matiere.nom ?? 'Cours';
    const classeNom = cours?.classe.nom ?? '—';
    const dateFormatee = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Construire le tableau de batch emails
    const emailsToSend = etudiants
      .filter((e) => e.emailParent)
      .map((etudiant) => ({
        from: config.emailFrom!,
        to: etudiant.emailParent!,
        subject: `Absence de ${etudiant.prenom} ${etudiant.nom} — ${matiereNom}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Absence constatée</h2>
            <p>Bonjour,</p>
            <p>
              Nous vous informons que <strong>${etudiant.prenom} ${etudiant.nom}</strong>
              a été marqué(e) <strong>absent(e)</strong> :
            </p>
            <ul style="background: #fef2f2; padding: 12px 20px; border-radius: 8px; list-style: none;">
              <li style="margin: 4px 0;"><strong>Date :</strong> ${dateFormatee}</li>
              <li style="margin: 4px 0;"><strong>Matière :</strong> ${matiereNom}</li>
              <li style="margin: 4px 0;"><strong>Classe :</strong> ${classeNom}</li>
            </ul>
            <p>Si cette absence est justifiée, merci de contacter l'administration.</p>
            <p style="margin-top: 20px;">Cordialement,<br/>L'administration</p>
          </div>
        `,
      }));

    // Envoi groupé via batch (max 100 emails par batch)
    if (emailsToSend.length > 0) {
      // Si plus de 100 emails, découper en plusieurs batchs
      const BATCH_SIZE = 100;
      const resend = new Resend(config.resendApiKey);

      for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
        const batch = emailsToSend.slice(i, i + BATCH_SIZE);
        try {
          await resend.batch.send(batch);
          console.log(`[PRESENCE] ${batch.length} email(s) envoyé(s)`);
        } catch (emailError) {
          console.error(`[PRESENCE] Erreur envoi batch ${i / BATCH_SIZE + 1}:`, emailError);
          // On continue avec les autres batchs
        }
      }
    }
  } catch (e) {
    console.error('[PRESENCE] Erreur globale envoi emails:', e);
    // On ne bloque pas la réponse : la présence est déjà enregistrée
  }

  return NextResponse.json({ ok: true });
});

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const coursId = searchParams.get('coursId');
  const date = searchParams.get('date');

  if (!coursId || !date) {
    return NextResponse.json(
      { erreur: 'coursId et date requis' },
      { status: 400 }
    );
  }

  const db = await getPrismaDynamic();
  const presences = await db.presence.findMany({
    where: { coursId, date: new Date(date) },
  });

  return NextResponse.json(presences);
});