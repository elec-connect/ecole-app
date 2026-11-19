'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function AnnoncesRecentesParent() {
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/annonces')
      .then((r) => r.json())
      .then((data) => {
        const maintenant = new Date();
        const actives = (data as any[]).filter(
          (a) => !a.expireLe || new Date(a.expireLe) > maintenant
        );
        setAnnonces(actives.slice(0, 3)); // 3 plus récentes
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;
  if (annonces.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">📢 Annonces récentes</h2>
        <Link href="/parent/annonces" className="text-sm text-blue-600 hover:underline">
          Voir toutes →
        </Link>
      </div>
      <div className="space-y-2">
        {annonces.map((a) => (
          <div key={a.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                🏫 {a.classe?.nom}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(a.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <p className="font-semibold text-sm">{a.titre}</p>
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{a.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}