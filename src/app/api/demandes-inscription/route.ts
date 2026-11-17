import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getConfig } from '@/lib/config';
import { Resend } from 'resend';

const schema = z.object({
  nom: z.string().min(2, 'Nom de l\'élève requis'),
  prenom: z.string().min(2, 'Prénom de l\'élève requis'),
  emailEleve: z.string().email('Email élève invalide'),
  emailParent: z.string().email('Email parent invalide'),
  nomParent: z.string().min(2, 'Nom du parent requis'),
  prenomParent: z.string().min(2, 'Prénom du parent requis'),
  telephone: z.string().optional().or(z.literal('')),
  niveauDemande: z.enum([
  '1ere_primaire', '2eme_primaire', '3eme_primaire', '4eme_primaire', '5eme_primaire', '6eme_primaire',
  '7eme', '8eme', '9eme',
  '1ere', '2eme', '3eme', '4eme',
]),
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

    // ⭐ VÉRIFICATION : on ne bloque que si l'EMAIL ÉLÈVE est déjà en attente.
    // L'email parent n'est plus vérifié, ce qui permet à un parent 
    // d'inscrire plusieurs enfants en même temps.
    const existante = await db.demandeInscription.findFirst({
      where: {
        emailEleve: parsed.data.emailEleve,
        statut: 'EN_ATTENTE',
      },
    });

    if (existante) {
      return NextResponse.json(
        { erreur: 'Une demande est déjà en attente pour cet email élève.' },
        { status: 409 }
      );
    }

    // Créer la demande de pré-inscription
    const demande = await db.demandeInscription.create({
      data: {
        nom: parsed.data.nom,
        prenom: parsed.data.prenom,
        emailEleve: parsed.data.emailEleve,
        emailParent: parsed.data.emailParent,
        nomParent: parsed.data.nomParent,
        prenomParent: parsed.data.prenomParent,
        telephone: parsed.data.telephone || null,
        niveauDemande: parsed.data.niveauDemande,
        statut: 'EN_ATTENTE',
      },
    });

    // Créer une notification pour les admins
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

    // Envoyer un email de confirmation au parent
    try {
      const config = await getConfig();
      if (config.resendApiKey && config.emailFrom) {
        const resend = new Resend(config.resendApiKey);
        
        const niveauLabel =
          {
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
}[parsed.data.niveauDemande] ?? parsed.data.niveauDemande;

        await resend.emails.send({
          from: config.emailFrom,
          to: parsed.data.emailParent,
          subject: 'Confirmation de votre demande d\'inscription',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Bonjour ${parsed.data.prenomParent} ${parsed.data.nomParent},</h2>
              <p>Nous avons bien reçu votre demande d'inscription pour <strong>${parsed.data.prenom} ${parsed.data.nom}</strong> en <strong>${niveauLabel}</strong>.</p>
              <p>Votre demande est actuellement <strong>en cours d'examen</strong>. Vous recevrez un email avec les identifiants de connexion (élève et parent) dès qu'elle sera validée.</p>
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