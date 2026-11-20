'use client';

import { useState, useEffect } from 'react';

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-900',
  RETARD: 'bg-amber-50 border-amber-200 text-amber-900',
  ANNULATION: 'bg-red-50 border-red-200 text-red-900',
  DEVOIR: 'bg-purple-50 border-purple-200 text-purple-900',
  AUTRE: 'bg-gray-50 border-gray-200 text-gray-900',
};

const TYPE_ICONS: Record<string, string> = {
  INFO: '📢',
  RETARD: '⏰',
  ANNULATION: '❌',
  DEVOIR: '📝',
  AUTRE: '📌',
};

export function AnnoncesEleve({ classeId }: { classeId: string }) {
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/annonces')
      .then((r) => r.json())
      .then((data) => {
        // Filtrer les annonces non expirées
        const maintenant = new Date();
        const actives = (data as any[]).filter(
          (a) => !a.expireLe || new Date(a.expireLe) > maintenant
        );
        setAnnonces(actives);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;
  if (annonces.length === 0) {
    return <p className="text-sm text-gray-500">Aucune annonce pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {annonces.map((a) => {
        const color = TYPE_COLORS[a.type] || TYPE_COLORS.INFO;
        const icon = TYPE_ICONS[a.type] || '📢';
        return (
          <div key={a.id} className={`p-4 rounded-lg border ${color}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{icon}</span>
                  <h3 className="font-semibold">{a.titre}</h3>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.contenu}</p>
                <p className="text-xs mt-2 opacity-70">
                  👨‍🏫 {a.professeur.prenom} {a.professeur.nom} · {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}