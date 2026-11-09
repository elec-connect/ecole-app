'use client';

import { useState } from 'react';

type Matiere = { id: string; nom: string; coefficient: number };

type EtudiantMoyenne = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  moyennesParMatiere: Record<string, { moyenne: number | null; nbNotes: number }>;
  moyenneGenerale: number | null;
};

interface Props {
  matieres: Matiere[];
  etudiants: EtudiantMoyenne[];
}

function couleur(m: number | null): string {
  if (m === null) return 'text-gray-300';
  if (m >= 16) return 'text-green-700 font-bold';
  if (m >= 14) return 'text-green-600 font-semibold';
  if (m >= 12) return 'text-blue-600 font-semibold';
  if (m >= 10) return 'text-orange-600 font-semibold';
  return 'text-red-600 font-semibold';
}

type Tri = 'nom' | 'moyenne' | 'classe';

export function MoyennesTable({ matieres, etudiants }: Props) {
  const [tri, setTri] = useState<Tri>('moyenne');
  const [recherche, setRecherche] = useState('');

  const etudiantsTries = [...etudiants]
    .filter((e) => {
      const q = recherche.toLowerCase().trim();
      if (!q) return true;
      return (
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (tri === 'moyenne') {
        if (a.moyenneGenerale === null && b.moyenneGenerale === null) return 0;
        if (a.moyenneGenerale === null) return 1;
        if (b.moyenneGenerale === null) return -1;
        return b.moyenneGenerale - a.moyenneGenerale;
      }
      return (a.nom + a.prenom).localeCompare(b.nom + b.prenom);
    });

  // Statistiques de classe
  const moyennesValides = etudiants.filter((e) => e.moyenneGenerale !== null).map((e) => e.moyenneGenerale!);
  const moyenneClasse = moyennesValides.length > 0
    ? Math.round((moyennesValides.reduce((a, b) => a + b, 0) / moyennesValides.length) * 100) / 100
    : null;
  const meilleure = moyennesValides.length > 0 ? Math.max(...moyennesValides) : null;
  const plusBasse = moyennesValides.length > 0 ? Math.min(...moyennesValides) : null;
  const reussite = moyennesValides.length > 0
    ? Math.round((moyennesValides.filter((m) => m >= 10).length / moyennesValides.length) * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Statistiques de classe */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 uppercase font-semibold">Moyenne classe</p>
          <p className={'text-2xl ' + couleur(moyenneClasse)}>{moyenneClasse !== null ? moyenneClasse.toFixed(2) : '—'}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-green-700 uppercase font-semibold">Meilleure</p>
          <p className={'text-2xl ' + couleur(meilleure)}>{meilleure !== null ? meilleure.toFixed(2) : '—'}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs text-red-700 uppercase font-semibold">Plus basse</p>
          <p className={'text-2xl ' + couleur(plusBasse)}>{plusBasse !== null ? plusBasse.toFixed(2) : '—'}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs text-purple-700 uppercase font-semibold">Taux de réussite</p>
          <p className="text-2xl font-bold text-purple-700">{reussite !== null ? reussite + '%' : '—'}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="moyenne">Moyenne (décroissante)</option>
            <option value="nom">Nom (alphabétique)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
          <input
            type="text"
            placeholder="Nom, prénom ou email..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50">
                Élève
              </th>
              {matieres.map((m) => (
                <th key={m.id} className="text-center px-3 py-3 text-xs font-semibold text-gray-600 min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span>{m.nom}</span>
                    <span className="text-gray-400 font-normal">Coef. {m.coefficient}</span>
                  </div>
                </th>
              ))}
              <th className="text-center px-4 py-3 text-xs font-semibold text-blue-700 uppercase bg-blue-50">
                Moyenne
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {etudiantsTries.length === 0 ? (
              <tr>
                <td colSpan={matieres.length + 2} className="text-center py-8 text-gray-400 text-sm">
                  Aucun élève
                </td>
              </tr>
            ) : (
              etudiantsTries.map((et, idx) => (
                <tr key={et.id} className={'hover:bg-gray-50 ' + (idx === 0 && tri === 'moyenne' && et.moyenneGenerale !== null ? 'bg-yellow-50' : '')}>
                  <td className="px-4 py-3 text-sm font-medium sticky left-0 bg-white">
                    <div className="flex items-center gap-2">
                      {idx === 0 && tri === 'moyenne' && et.moyenneGenerale !== null && (
                        <span title="Meilleure moyenne">🥇</span>
                      )}
                      <div>
                        <p>{et.prenom} {et.nom}</p>
                        <p className="text-xs text-gray-400">{et.email}</p>
                      </div>
                    </div>
                  </td>
                  {matieres.map((m) => {
                    const mm = et.moyennesParMatiere[m.id];
                    return (
                      <td key={m.id} className="px-3 py-3 text-sm text-center">
                        {mm?.moyenne !== null && mm?.moyenne !== undefined ? (
                          <span className={couleur(mm.moyenne)}>
                            {mm.moyenne.toFixed(2)}
                            <span className="text-xs text-gray-400 block font-normal">{mm.nbNotes} note(s)</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-sm text-center bg-blue-50">
                    <span className={couleur(et.moyenneGenerale) + ' text-lg'}>
                      {et.moyenneGenerale !== null ? et.moyenneGenerale.toFixed(2) + '/20' : '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}