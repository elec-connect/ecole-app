'use client';

import { useState, useEffect } from 'react';

type Classe = { id: string; nom: string; niveau: string };

export default function GenererEmploiPage() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [remplacer, setRemplacer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState<any>(null);

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then(setClasses);
  }, []);

  function toggleClasse(id: string) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function generer() {
    if (selection.length === 0) return;
    setLoading(true);
    setResultat(null);

    const res = await fetch('/api/emplois/generer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classeIds: selection, remplacerExistant: remplacer }),
    });

    const data = await res.json();
    setLoading(false);
    setResultat(data);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤖 Génération automatique</h1>
        <p className="text-gray-500 mt-1">
          L&apos;algorithme place les cours en respectant les contraintes (profs, salles, volumes horaires)
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Classes à générer ({selection.length} sélectionnée{selection.length > 1 ? 's' : ''})
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {classes.map((c) => {
              const selected = selection.includes(c.id);
              return (
                <label key={c.id} className={'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ' + (selected ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100')}>
                  <input type="checkbox" checked={selected} onChange={() => toggleClasse(c.id)} />
                  <span className="font-medium">{c.nom}</span>
                  <span className={'text-xs ' + (selected ? 'text-blue-100' : 'text-gray-400')}>({c.niveau})</span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={remplacer} onChange={(e) => setRemplacer(e.target.checked)} />
          <span className="text-sm">Remplacer les cours existants de ces classes</span>
        </label>

        <button
          onClick={generer}
          disabled={loading || selection.length === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Génération en cours...' : '🚀 Générer l\'emploi du temps'}
        </button>
      </div>

      {resultat && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold">Résultat</h2>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-green-600">{resultat.nbGeneres}</span>
            <span className="text-sm text-gray-600">cours générés</span>
          </div>

          {resultat.erreurs?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-orange-800">⚠️ {resultat.erreurs.length} avertissement(s)</p>
              <ul className="text-xs text-orange-700 list-disc list-inside space-y-0.5">
                {resultat.erreurs.slice(0, 10).map((e: string, i: number) => <li key={i}>{e}</li>)}
                {resultat.erreurs.length > 10 && <li>... et {resultat.erreurs.length - 10} autres</li>}
              </ul>
            </div>
          )}

          <a href="/admin/emplois" className="inline-block text-sm text-blue-600 hover:underline">
            → Voir l&apos;emploi du temps
          </a>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-sm text-blue-800">
        <p className="font-medium mb-2">⚙️ Comment ça marche</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Vérifie les volumes horaires (Maths 4h, Français 3h...)</li>
          <li>Assigne un prof disponible à chaque matière</li>
          <li>Cherche un créneau libre (classe + prof + salle)</li>
          <li>Place les cours en évitant les conflits</li>
          <li>Vous pouvez ensuite éditer manuellement dans /admin/cours</li>
        </ol>
      </div>
    </div>
  );
}