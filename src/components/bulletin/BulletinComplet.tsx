'use client';

import { useState } from 'react';

type Note = {
  id: string;
  type: string;
  nomEvaluation: string;
  valeur: number;
  coefficient: number;
  date: string;
  commentaire?: string | null;
};

type Matiere = {
  id: string;
  nom: string;
  coefficient: number;
  moyenne: number | null;
  nbNotes: number;
  appreciation: { label: string; color: string } | null;
  notes: Note[];
};

type BulletinData = {
  eleve: { id: string; nom: string; prenom: string; email: string };
  classe: { id: string; nom: string; niveau: string; anneeScolaire: string };
  matieres: Matiere[];
  moyenneGenerale: number | null;
  mention: { label: string; color: string } | null;
  rang: number;
  totalEleves: number;
  statsClasse: {
    moyenneClasse: number | null;
    meilleureMoyenne: number | null;
    plusBasseMoyenne: number | null;
  };
  absences: {
    total: number;
    absents: number;
    retards: number;
    justifies: number;
    detail: { date: string; matiere: string; statut: string }[];
  };
};

interface Props {
  data: BulletinData;
  etudiantId: string;
  anneeScolaire: string;
}

export function BulletinComplet({ data, etudiantId, anneeScolaire }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function telechargerPDF() {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/bulletin/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etudiantId, anneeScolaire }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert('❌ ' + (data.erreur ?? 'Erreur'));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin-${data.eleve.nom}-${data.eleve.prenom}-${anneeScolaire.replace(/[^a-z0-9]/gi, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('❌ ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  }

  function imprimer() {
    window.print();
  }

  const { eleve, classe, matieres, moyenneGenerale, mention, rang, totalEleves, statsClasse, absences } = data;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          onClick={telechargerPDF}
          disabled={pdfLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
          {pdfLoading ? 'Génération...' : '📄 Télécharger en PDF'}
        </button>
        <button
          onClick={imprimer}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          🖨️ Imprimer
        </button>
      </div>

      {/* Bulletin */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 print:shadow-none print:border-none">
        {/* En-tête */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">BULLETIN SCOLAIRE</h2>
          <p className="text-gray-600 text-sm mt-1">Année scolaire {classe.anneeScolaire}</p>
        </div>

        {/* Infos élève */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase">Élève</p>
            <p className="font-semibold text-gray-900">{eleve.prenom} {eleve.nom}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Classe</p>
            <p className="font-semibold text-gray-900">{classe.nom} ({classe.niveau})</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Rang</p>
            <p className="font-semibold text-gray-900">{rang}ème / {totalEleves}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Email</p>
            <p className="font-semibold text-gray-900 text-xs">{eleve.email}</p>
          </div>
        </div>

        {/* Tableau des matières */}
        <table className="w-full border border-gray-200 mb-6">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 uppercase border border-gray-200">Matière</th>
              <th className="text-center px-2 py-2 text-xs font-semibold text-gray-700 uppercase border border-gray-200">Coef.</th>
              <th className="text-center px-2 py-2 text-xs font-semibold text-gray-700 uppercase border border-gray-200">Notes</th>
              <th className="text-center px-2 py-2 text-xs font-semibold text-gray-700 uppercase border border-gray-200">Moyenne</th>
              <th className="text-center px-2 py-2 text-xs font-semibold text-gray-700 uppercase border border-gray-200">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {matieres.map((m) => (
              <>
                <tr key={m.id} className="bg-white">
                  <td className="px-3 py-2 text-sm font-medium border border-gray-200">{m.nom}</td>
                  <td className="px-2 py-2 text-sm text-center border border-gray-200">{m.coefficient}</td>
                  <td className="px-2 py-2 text-sm text-center border border-gray-200 text-gray-600">{m.nbNotes}</td>
                  <td className="px-2 py-2 text-sm text-center border border-gray-200">
                    {m.moyenne !== null ? (
                      <span className={'font-bold ' + (m.moyenne >= 10 ? 'text-green-600' : 'text-red-600')}>
                        {m.moyenne.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-sm text-center border border-gray-200">
                    {m.appreciation ? (
                      <span className={m.appreciation.color + ' font-medium'}>
                        {m.appreciation.label}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
                {/* Détail des notes */}
                {m.notes.length > 0 && (
                  <tr key={m.id + '-detail'}>
                    <td colSpan={5} className="px-3 py-2 bg-gray-50 border border-gray-200">
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium text-gray-700 mb-1">Détail :</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {m.notes.map((n) => (
                            <div key={n.id} className="flex items-center gap-2">
                              <span className="text-gray-400">•</span>
                              <span className="font-medium">{n.nomEvaluation}</span>
                              <span className="text-gray-500">
                                ({new Date(n.date).toLocaleDateString('fr-FR')})
                              </span>
                              <span className={'font-semibold ' + (n.valeur >= 10 ? 'text-green-600' : 'text-red-600')}>
                                {n.valeur.toFixed(2)}/20
                              </span>
                              <span className="text-gray-400">coef {n.coefficient}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {/* Moyenne générale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs text-blue-700 uppercase font-medium">Moyenne générale</p>
            <p className={'text-3xl font-bold ' + (moyenneGenerale !== null && moyenneGenerale >= 10 ? 'text-green-600' : 'text-red-600')}>
              {moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : '—'}/20
            </p>
            {mention && (
              <p className={'text-sm font-semibold ' + mention.color}>{mention.label}</p>
            )}
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-xs text-purple-700 uppercase font-medium">Rang dans la classe</p>
            <p className="text-3xl font-bold text-purple-700">
              {rang}<span className="text-lg">ème</span>
            </p>
            <p className="text-xs text-purple-600">sur {totalEleves} élèves</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-medium">Statistiques de classe</p>
            <div className="text-sm space-y-1 mt-1">
              <p>Moyenne : <span className="font-semibold">{statsClasse.moyenneClasse?.toFixed(2) ?? '—'}/20</span></p>
              <p>Meilleure : <span className="font-semibold text-green-600">{statsClasse.meilleureMoyenne?.toFixed(2) ?? '—'}/20</span></p>
              <p>Plus basse : <span className="font-semibold text-red-600">{statsClasse.plusBasseMoyenne?.toFixed(2) ?? '—'}/20</span></p>
            </div>
          </div>
        </div>

        {/* Absences */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 mb-6">
          <h3 className="text-sm font-semibold text-orange-900 mb-2">📅 Absences et retards</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-orange-700">Absences</p>
              <p className="text-xl font-bold text-red-600">{absences.absents}</p>
            </div>
            <div>
              <p className="text-xs text-orange-700">Retards</p>
              <p className="text-xl font-bold text-orange-600">{absences.retards}</p>
            </div>
            <div>
              <p className="text-xs text-orange-700">Justifiées</p>
              <p className="text-xl font-bold text-blue-600">{absences.justifies}</p>
            </div>
          </div>
          {absences.detail.length > 0 && (
            <div className="mt-3 text-xs text-gray-600">
              <p className="font-medium mb-1">Dernières absences :</p>
              <ul className="space-y-0.5">
                {absences.detail.slice(0, 5).map((a, i) => (
                  <li key={i}>
                    • {new Date(a.date).toLocaleDateString('fr-FR')} - {a.matiere} ({a.statut})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6 mt-10 pt-6 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-8">Signature du professeur principal</p>
            <div className="border-b border-dashed border-gray-300 h-16" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-8">Cachet de l'établissement</p>
            <div className="border-b border-dashed border-gray-300 h-16" />
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Bulletin généré le {new Date().toLocaleDateString('fr-FR')} — ÉcoleApp
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
        }
      `}</style>
    </div>
  );
}