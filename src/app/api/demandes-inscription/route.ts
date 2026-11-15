import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { Resend } from 'resend';

const schema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  emailParent: z.string().email(),
  telephone: z.string().optional().or(z.literal('')),
  niveauDemande: z.enum(['7eme', '8eme', '9eme', '1ere', '2eme', '3eme', '4eme']),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { erreur: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = await getPrismaDynamic();

    // Vérifier qu'une demande n'est pas déjà en attente pour cet email
    const existante = await db.demandeInscription.findFirst({
      where: {
        emailParent: parsed.data.emailParent,
        statut: 'EN_ATTENTE',
      },
    });

    if (existante) {
      return NextResponse.json(
        { erreur: 'Une demande est déjà en attente pour cet email.' },
        { status: 409 }
      );
    }

    const demande = await db.demandeInscription.create({
      data: {
        nom: parsed.data.nom,
        prenom: parsed.data.prenom,
        emailParent: parsed.data.emailParent,
        telephone: parsed.data.telephone || null,
        niveauDemande: parsed.data.niveauDemande,
        statut: 'EN_ATTENTE',
      },
    });

    // Notification pour tous les admins
    try {
      const admins = await db.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, actif: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map((admin) => ({
            type: 'INSCRIPTION',
            message: `Nouvelle demande d'inscription : ${parsed.data.prenom} ${parsed.data.nom} (${parsed.data.niveauDemande})`,
            lien: '/admin/demandes-inscription',
            destinataireId: admin.id,
          })),
        });
      }
    } catch (notifError) {
      console.error('[DEMANDE INSCRIPTION] Erreur notification:', notifError);
    }

    // Email de confirmation au parent (best effort)
    try {
      const config = await getConfig();
      if (config.resendApiKey && config.emailFrom) {
        const resend = new Resend(config.resendApiKey);
        const niveauLabel =
          {
            '7eme': '7ème année',
            '8eme': '8ème année',
            '9eme': '9ème année',
            '1ere': '1ère année secondaire',
            '2eme': '2ème année secondaire',
            '3eme': '3ème année secondaire',
            '4eme': '4ème année secondaire',
          }[parsed.data.niveauDemande] ?? parsed.data.niveauDemande;

        await resend.emails.send({
          from: config.emailFrom,
          to: parsed.data.emailParent,
          subject: 'Confirmation de votre demande d\'inscription',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Bonjour,</h2>
              <p>Nous avons bien reçu votre demande d'inscription pour <strong>${parsed.data.prenom} ${parsed.data.nom}</strong> en <strong>${niveauLabel}</strong>.</p>
              <p>Votre demande est actuellement <strong>en cours d'examen</strong>. Vous recevrez un email dès qu'elle sera validée.</p>
              <p>Cordialement,<br/>L'administration</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error('[DEMANDE INSCRIPTION] Erreur email confirmation:', emailError);
    }

    return NextResponse.json({ ok: true, id: demande.id }, { status: 201 });
  } catch (error) {
    console.error('[DEMANDE INSCRIPTION] Erreur:', error);
    return NextResponse.json(
      { erreur: 'Erreur serveur lors de la demande d\'inscription' },
      { status: 500 }
    );
  }
}