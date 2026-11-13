'use client';

import { useEffect, useState, useRef } from 'react';

type ConfigForm = {
  databaseUrl: string;
  jwtSecret: string;
  appName: string;
  anneeScolaireCourante: string;
  logoUrl: string;
  cronSecret: string;
  configPassword: string;
  resendApiKey: string;
  emailFrom: string;
};

const initial: ConfigForm = {
  databaseUrl: '',
  jwtSecret: '',
  appName: 'ÉcoleApp',
  anneeScolaireCourante: '2025-2026',
  logoUrl: '',
  cronSecret: '',
  configPassword: '',
  resendApiKey: '',
  emailFrom: '',
};

export default function ConfigurationPage() {
  const [form, setForm] = useState<ConfigForm>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Indique quels champs sensibles sont déjà configurés en base
  const [configured, setConfigured] = useState({
    databaseUrl: false,
    jwtSecret: false,
    cronSecret: false,
    configPassword: false,
    resendApiKey: false,
  });

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfigured({
          databaseUrl: Boolean(data.databaseUrl && data.databaseUrl !== '********'),
          jwtSecret: Boolean(data.jwtSecret),
          cronSecret: Boolean(data.cronSecret),
          configPassword: Boolean(data.configPassword),
          resendApiKey: Boolean(data.resendApiKey),
        });

        // On ne pré-remplit JAMAIS les champs sensibles avec la valeur masquée.
        // Vide = "ne pas modifier" (géré côté serveur).
        setForm({
          ...initial,
          appName: data.appName ?? initial.appName,
          anneeScolaireCourante: data.anneeScolaireCourante ?? initial.anneeScolaireCourante,
          logoUrl: data.logoUrl ?? '',
          emailFrom: data.emailFrom ?? '',
          databaseUrl: '',
          jwtSecret: '',
          cronSecret: '',
          configPassword: '',
          resendApiKey: '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function update<K extends keyof ConfigForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    // On n'envoie que les champs réellement modifiés + les champs non sensibles.
    // Les champs sensibles vides ne sont pas envoyés → le serveur conserve l'ancienne valeur.
    const payload: Record<string, string> = {
      appName: form.appName,
      anneeScolaireCourante: form.anneeScolaireCourante,
      logoUrl: form.logoUrl,
      emailFrom: form.emailFrom,
    };
    if (form.databaseUrl.trim()) payload.databaseUrl = form.databaseUrl.trim();
    if (form.jwtSecret.trim()) payload.jwtSecret = form.jwtSecret.trim();
    if (form.cronSecret.trim()) payload.cronSecret = form.cronSecret.trim();
    if (form.configPassword.trim()) payload.configPassword = form.configPassword.trim();
    if (form.resendApiKey.trim()) payload.resendApiKey = form.resendApiKey.trim();

    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      setMessage('✅ Configuration enregistrée');
      // On vide les champs sensibles après sauvegarde (ils sont maintenant en base)
      setForm((f) => ({
        ...f,
        databaseUrl: '',
        jwtSecret: '',
        cronSecret: '',
        configPassword: '',
        resendApiKey: '',
      }));
      setConfigured((c) => ({
        databaseUrl: c.databaseUrl || Boolean(payload.databaseUrl),
        jwtSecret: c.jwtSecret || Boolean(payload.jwtSecret),
        cronSecret: c.cronSecret || Boolean(payload.cronSecret),
        configPassword: c.configPassword || Boolean(payload.configPassword),
        resendApiKey: c.resendApiKey || Boolean(payload.resendApiKey),
      }));
    } else {
      setMessage('❌ Erreur lors de l\'enregistrement');
    }
  }

  async function uploaderLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/config/logo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setForm((f) => ({ ...f, logoUrl: data.logoUrl }));
        setMessage('✅ Logo mis à jour');
      } else {
        setMessage('❌ ' + (data.erreur ?? 'Erreur'));
      }
    } catch (err: any) {
      setMessage('❌ ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function supprimerLogo() {
    if (!confirm('Supprimer le logo ?')) return;
    setMessage('');

    const res = await fetch('/api/config/logo', { method: 'DELETE' });
    if (res.ok) {
      setForm((f) => ({ ...f, logoUrl: '' }));
      setMessage('✅ Logo supprimé');
    } else {
      setMessage('❌ Erreur');
    }
  }

  async function genererCronSecret() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
    setForm((f) => ({ ...f, cronSecret: secret }));
  }

  async function verrouiller() {
    const res = await fetch('/api/config/lock', { method: 'POST' });
    if (res.ok) {
      window.location.href = '/admin/dashboard';
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Chargement…</div>;

  const BadgeConfigure = () => (
    <span className="inline-block ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
      ✅ déjà configuré
    </span>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Les valeurs sont chiffrées (AES-256-GCM) en base. Seul <code>CONFIG_ENCRYPTION_KEY</code> reste dans Vercel.
          </p>
        </div>
        <button
          type="button"
          onClick={verrouiller}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 text-sm font-medium whitespace-nowrap"
          title="Fermer la session de configuration"
        >
          🔒 Verrouiller
        </button>
      </div>

      <form onSubmit={enregistrer} className="space-y-6">
        {/* LOGO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">🖼️ Logo de l'établissement</h2>
          <p className="text-xs text-gray-500">
            Format JPG, PNG, WEBP ou SVG · Taille max 2 Mo · Recommandé : 512×512 px
          </p>

          <div className="flex items-center gap-4">
            {form.logoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white p-2"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center">
                Aucun<br />logo
              </div>
            )}

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                onChange={uploaderLogo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {uploading ? 'Upload...' : form.logoUrl ? '🔄 Changer le logo' : '📤 Uploader un logo'}
              </button>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={supprimerLogo}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  🗑️ Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Base de données */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">
            🗄️ Base de données
            {configured.databaseUrl && <BadgeConfigure />}
          </h2>
          <input
            type="text"
            value={form.databaseUrl}
            onChange={(e) => update('databaseUrl', e.target.value)}
            placeholder="postgresql://..."
            className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs"
          />
          <p className="text-xs text-gray-500">
            Laisser vide pour ne pas modifier.{' '}
            {configured.databaseUrl && (
              <span className="text-green-700">Une URL est déjà configurée.</span>
            )}
          </p>
          <a
            href="https://neon.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            🔗 Créer ou gérer une base PostgreSQL sur Neon →
          </a>
        </div>

        {/* Authentification */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">
            🔐 Authentification (JWT)
            {configured.jwtSecret && <BadgeConfigure />}
          </h2>
          <input
            type="password"
            value={form.jwtSecret}
            onChange={(e) => update('jwtSecret', e.target.value)}
            placeholder="Laisser vide pour ne pas changer"
            className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs"
          />
          <p className="text-xs text-gray-500">
            Modifier ce secret invalidera toutes les sessions en cours.
          </p>
          <a
            href="https://jwt.io/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            🔗 En savoir plus sur les JSON Web Tokens (JWT) →
          </a>
        </div>

        {/* Mot de passe de configuration */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">
            🔒 Mot de passe de configuration
            {configured.configPassword && <BadgeConfigure />}
          </h2>
          <p className="text-xs text-gray-500">
            Ce mot de passe est demandé avant d&apos;accéder à cette page (protection supplémentaire).
          </p>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Nouveau mot de passe (laisser vide pour ne pas changer)
            </label>
            <input
              type="password"
              value={form.configPassword}
              onChange={(e) => update('configPassword', e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs"
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-medium">⚠️ Important</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Ce mot de passe est différent du mot de passe admin</li>
              <li>Il est demandé à chaque connexion à <code>/admin/configuration</code></li>
              <li>La session reste valide 1 heure</li>
              <li><strong>Notez-le précieusement</strong> — si oublié, il faut le réinitialiser via la base de données</li>
            </ul>
          </div>
        </div>

        {/* Resend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">
            📧 Envoi d&apos;emails (Resend)
            {configured.resendApiKey && <BadgeConfigure />}
          </h2>
          <p className="text-xs text-gray-500">
            Service utilisé pour envoyer les emplois du temps, absences et bulletins.{' '}
            <a
              href="https://resend.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Créer un compte gratuit sur Resend →
            </a>
          </p>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Clé API Resend</label>
            <input
              type="password"
              value={form.resendApiKey}
              onChange={(e) => update('resendApiKey', e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxx"
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laisser vide pour ne pas changer. Format : <code>re_...</code>
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email expéditeur</label>
            <input
              value={form.emailFrom}
              onChange={(e) => update('emailFrom', e.target.value)}
              placeholder="ÉcoleApp <noreply@votre-domaine.com>"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              En dev : <code>onboarding@resend.dev</code> (envoi uniquement à votre propre email).
              En prod : vérifiez votre domaine dans Resend.
            </p>
          </div>

          <a
            href="https://resend.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            🔗 Documentation Resend →
          </a>
        </div>

        {/* Cron Secret */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">
            ⏰ Tâches automatiques (Cron)
            {configured.cronSecret && <BadgeConfigure />}
          </h2>
          <p className="text-xs text-gray-500">
            Secret utilisé par Vercel Cron pour authentifier les tâches automatiques
            (ex: suppression des archives de plus de 10 ans).
          </p>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Cron Secret</label>
            <input
              type="password"
              value={form.cronSecret}
              onChange={(e) => update('cronSecret', e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={genererCronSecret}
              className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-900"
            >
              🎲 Générer un secret aléatoire
            </button>
            {form.cronSecret && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(form.cronSecret);
                  setMessage('✅ Secret copié dans le presse-papiers');
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
              >
                📋 Copier
              </button>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p className="font-medium">⚠️ Important</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Générez un secret unique pour cette école</li>
              <li>Copiez-le et ajoutez-le dans <strong>Vercel → Settings → Environment Variables</strong> sous le nom <code>CRON_SECRET</code></li>
              <li>Redéployez pour que Vercel l&apos;injecte dans les crons</li>
            </ul>
          </div>
          <a
            href="https://vercel.com/docs/cron-jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            🔗 Documentation Vercel Cron Jobs →
          </a>
        </div>

        {/* Général */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">🏫 Général</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom établissement</label>
              <input
                value={form.appName}
                onChange={(e) => update('appName', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Année scolaire</label>
              <input
                value={form.anneeScolaireCourante}
                onChange={(e) => update('anneeScolaireCourante', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {message && (
          <div
            className={
              'p-3 rounded ' +
              (message.startsWith('✅')
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700')
            }
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
        </button>
      </form>
    </div>
  );
}