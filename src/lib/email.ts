import { getConfig } from './config';

export async function envoyerEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const config = await getConfig();
  const RESEND_API_KEY = config.resendApiKey;
  const FROM_EMAIL = config.emailFrom ?? 'ÉcoleApp <onboarding@resend.dev>';

  if (!RESEND_API_KEY) {
    throw new Error('Clé API Resend non configurée. Allez dans /admin/configuration.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString('base64'),
      })),
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error('Erreur Resend: ' + (error.message ?? 'inconnu'));
  }

  return res.json();
}

export function htmlEmploiDuTemps(params: {
  destinataire: string;
  classeOuProf: string;
  anneeScolaire: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e40af;">📅 Emploi du temps</h2>
      <p>Bonjour ${params.destinataire},</p>
      <p>Voici votre emploi du temps pour <strong>${params.classeOuProf}</strong> — année scolaire ${params.anneeScolaire}.</p>
      <p>Vous trouverez le fichier PDF en pièce jointe.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">ÉcoleApp — Notification automatique</p>
    </div>
  `;
}