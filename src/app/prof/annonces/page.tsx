'use client';

import { useState, useEffect } from 'react';

type Classe = { id: string; nom: string; niveau: string };

const TYPES = [
  { value: 'INFO', label: '📢 Information', color: 'bg-blue-100 text-blue-700' },
  { value: 'RETARD', label: '⏰ Retard', color: 'bg-amber-100 text-amber-700' },
  { value: 'ANNULATION', label: '❌ Annulation', color: 'bg-red-100 text-red-700' },
  { value: 'DEVOIR', label: '📝 Devoir', color: 'bg-purple-100 text-purple-700' },
  { value: 'AUTRE', label: '📌 Autre', color: 'bg-gray-100 text-gray-700' },
];

export default function ProfAnnoncesPage() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [form, setForm] = useState({
    titre: '',
    contenu: '',
    type: 'INFO',
    classeId: '',
    expireLe: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function charger() {
    const [rc, ra] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/annonces'),
    ]);
    if (rc.ok) {
      const data = await rc.json();
      // Filtrer les classes où le prof enseigne
      const r = await fetch('/api/cours');
      const cours = await r.json();
      const classeIds = Array.from(new Set(cours.map((c: any) => c.classeId)));
      setClasses((data as Classe[]).filter((c) => classeIds.includes(c.id)));
    }
    if (ra.ok) setAnnonces(await ra.json());
  }

  useEffect(() => {
    charger();
  }, []);

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (!form.classeId) {
      setMessage('❌ Sélectionnez une classe.');
      return;
    }
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage('✅ Annonce publiée !');
      setForm({ titre: '', contenu: '', type: 'INFO', classeId: '', expireLe: '' });
      charger();
    } else {
      setMessage('❌ ' + (data.erreur || 'Erreur'));
    }
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return;
    const res = await fetch(`/api/annonces/${id}`, { method: 'DELETE' });
    if (res.ok) charger();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📢 Mes annonces</h1>
        <p className="text-gray-500 mt-1">
          Publiez des informations visibles par les élèves et parents de vos classes
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Formulaire de création */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4">➕ Nouvelle annonce</h2>
        <form onSubmit={publier} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select
              value={form.classeId}
              onChange={(e) => setForm({ ...form, classeId: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner une classe —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    form.type === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              required
              placeholder="Ex: Retard samedi matin"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={form.contenu}
              onChange={(e) => setForm({ ...form, contenu: e.target.value })}
              required
              rows={4}
              placeholder="Ex: Je serai en retard samedi 22/11, le cours commencera à 9h au lieu de 8h."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d&apos;expiration (optionnel)
            </label>
            <input
              type="datetime-local"
              value={form.expireLe}
              onChange={(e) => setForm({ ...form, expireLe: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              L&apos;annonce disparaîtra automatiquement après cette date.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Publication...' : '📢 Publier l\'annonce'}
          </button>
        </form>
      </div>

      {/* Liste des annonces */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">Mes annonces publiées ({annonces.length})</h2>
        </div>
        {annonces.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Aucune annonce publiée.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {annonces.map((a) => {
              const typeInfo = TYPES.find((t) => t.value === a.type) || TYPES[0];
              return (
                <div key={a.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          🏫 {a.classe.nom}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{a.titre}</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.contenu}</p>
                    </div>
                    <button
                      onClick={() => supprimer(a.id)}
                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}