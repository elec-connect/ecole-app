'use client';

import { useEffect, useState, useRef } from 'react';

type ConfigForm = {
  databaseUrl: string;
  jwtSecret: string;
  appName: string;
  anneeScolaireCourante: string;
  logoUrl: string;
};

const initial: ConfigForm = {
  databaseUrl: '',
  jwtSecret: '',
  appName: 'ÉcoleApp',
  anneeScolaireCourante: '2025-2026',
  logoUrl: '',
};

export default function ConfigurationPage() {
  const [form, setForm] = useState<ConfigForm>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setForm({ ...initial, ...data });
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

    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setMessage(res.ok ? '✅ Configuration enregistrée' : '❌ Erreur');
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

  if (loading) return <div className="p-8 text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Les valeurs sont chiffrées (AES-256-GCM) en base. Seul <code>CONFIG_ENCRYPTION_KEY</code> reste dans Vercel.
        </p>
      </div>

      <form onSubmit={enregistrer} className="space-y-6">
        {/* LOGO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-lg">🖼️ Logo de l'établissement</h2>
          <p className="text-xs text-gray-500">
            Format JPG, PNG, WEBP ou SVG · Taille max 500 Ko · Recommandé : 512×512 px
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
          <h2 className="font-semibold text-lg">🗄️ Base de données</h2>
          <input
            type="text"
            value={form.databaseUrl}
            onChange={(e) => update('databaseUrl', e.target.value)}
            placeholder="postgresql://..."
            className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs"
          />
          <p className="text-xs text-gray-500">Laisser vide pour ne pas modifier.</p>
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
          <h2 className="font-semibold text-lg">🔐 Authentification</h2>
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
              (message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')
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