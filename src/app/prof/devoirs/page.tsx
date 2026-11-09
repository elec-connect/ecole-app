'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

type Cours = {
  id: string;
  classe: { nom: string };
  matiere: { nom: string };
};

type Devoir = {
  id: string;
  titre: string;
  description?: string | null;
  deadline: string;
  fichierUrl?: string | null;
  cours: Cours;
};

export default function DevoirsPage() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [devoirs, setDevoirs] = useState<Devoir[]>([]);
  const [coursId, setCoursId] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fichierUrl, setFichierUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function charger() {
    const [rc, rd] = await Promise.all([fetch('/api/cours'), fetch('/api/devoirs')]);
    setCours(await rc.json());
    setDevoirs(await rd.json());
  }

  useEffect(() => {
    charger();
  }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/devoirs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coursId,
        titre,
        description: description || null,
        deadline,
        fichierUrl: fichierUrl || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      setMessage(`❌ ${err.erreur ?? 'Erreur'}`);
      return;
    }

    setMessage('✅ Devoir créé');
    setTitre('');
    setDescription('');
    setDeadline('');
    setFichierUrl('');
    setCoursId('');
    charger();
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce devoir ?')) return;
    const res = await fetch(`/api/devoirs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Erreur');
      return;
    }
    setDevoirs(devoirs.filter((d) => d.id !== id));
  }

  function estEnRetard(d: Devoir) {
    return new Date(d.deadline) < new Date();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Devoirs</h1>
        <p className="text-gray-500 mt-1">{devoirs.length} devoir(s) créé(s)</p>
      </div>

      <Card>
        <CardTitle className="mb-4">➕ Nouveau devoir</CardTitle>
        <form onSubmit={creer} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cours</label>
            <select
              value={coursId}
              onChange={(e) => setCoursId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.matiere.nom} — {c.classe.nom}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Consignes du devoir…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date limite
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <Input
              label="URL fichier (optionnel)"
              value={fichierUrl}
              onChange={(e) => setFichierUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading}>
              Créer le devoir
            </Button>
            {message && <span className="text-sm">{message}</span>}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">📋 Mes devoirs</h2>
        {devoirs.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-sm">Aucun devoir créé pour le moment.</p>
          </Card>
        ) : (
          devoirs.map((d) => {
            const enRetard = estEnRetard(d);
            return (
              <Card key={d.id} className={enRetard ? 'border-l-4 border-red-400' : 'border-l-4 border-blue-400'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{d.titre}</h3>
                      <Badge color={enRetard ? 'red' : 'blue'}>
                        {enRetard ? 'Dépassé' : 'En cours'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {d.cours.matiere.nom} · {d.cours.classe.nom}
                    </CardDescription>
                    <p className="text-xs text-gray-500 mt-2">
                      📅 Limite : {formatDate(d.deadline)}
                    </p>
                    {d.description && (
                      <p className="text-sm text-gray-700 mt-2">{d.description}</p>
                    )}
                    {d.fichierUrl && (
                      <a
                        href={d.fichierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      >
                        📎 Fichier joint
                      </a>
                    )}
                  </div>
                  <Button variant="danger" size="sm" onClick={() => supprimer(d.id)}>
                    Suppr.
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}