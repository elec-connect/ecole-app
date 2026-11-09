'use client';

import { useState, useEffect } from 'react';

type Statut = 'PRESENT' | 'ABSENT' | 'RETARD' | 'JUSTIFIE';

type Cours = {
  id: string;
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  classe: { id: string; nom: string };
  matiere: { id: string; nom: string };
};

type Etudiant = { id: string; nom: string; prenom: string; email: string };

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const STATUTS: { value: Statut; label: string; color: string }[] = [
  { value: 'PRESENT', label: 'Présent', color: 'bg-green-100 text-green-700 ring-green-500' },
  { value: 'ABSENT', label: 'Absent', color: 'bg-red-100 text-red-700 ring-red-500' },
  { value: 'RETARD', label: 'Retard', color: 'bg-orange-100 text-orange-700 ring-orange-500' },
  { value: 'JUSTIFIE', label: 'Justifié', color: 'bg-blue-100 text-blue-700 ring-blue-500' },
];

export function AppelTable({ cours }: { cours: Cours[] }) {
  const [coursId, setCoursId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!coursId) return;
    const c = cours.find((x) => x.id === coursId);
    if (!c) return;

    fetch('/api/etudiants?classeId=' + c.classe.id)
      .then((r) => r.json())
      .then((data: Etudiant[]) => {
        setEtudiants(data);
        const init: Record<string, Statut> = {};
        data.forEach((e) => (init[e.id] = 'PRESENT'));
        setStatuts(init);
      });
  }, [coursId, cours]);

  async function valider() {
    if (!coursId) {
      setMessage('Sélectionnez un cours');
      return;
    }
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/presences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coursId,
        date: new Date(date).toISOString(),
        presences: Object.entries(statuts).map(([etudiantId, statut]) => ({ etudiantId, statut })),
      }),
    });

    setLoading(false);
    setMessage(res.ok ? '✅ Appel enregistré' : '❌ Erreur');
  }

  function marquerTous(statut: Statut) {
    const newStatuts: Record<string, Statut> = {};
    etudiants.forEach((e) => (newStatuts[e.id] = statut));
    setStatuts(newStatuts);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cours</label>
            <select value={coursId} onChange={(e) => setCoursId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">— Sélectionner —</option>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {JOURS[c.jourSemaine]} {c.heureDebut}-{c.heureFin} · {c.matiere.nom} ({c.classe.nom})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        {etudiants.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-sm text-gray-500 self-center">Tout marquer :</span>
            {STATUTS.map((s) => (
              <button key={s.value} onClick={() => marquerTous(s.value)} className="px-3 py-1 bg-gray-200 text-gray-900 rounded text-xs hover:bg-gray-300">
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {etudiants.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Étudiant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etudiants.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">{e.prenom} {e.nom}</p>
                    <p className="text-xs text-gray-500">{e.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2 flex-wrap">
                      {STATUTS.map((s) => (
                        <button key={s.value} onClick={() => setStatuts({ ...statuts, [e.id]: s.value })} className={'px-2 py-1 rounded text-xs font-medium ' + (statuts[e.id] === s.value ? s.color + ' ring-2' : 'bg-gray-100 text-gray-500')}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {etudiants.length > 0 && (
        <div className="flex items-center gap-3">
          <button onClick={valider} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Enregistrement...' : "Valider l'appel"}
          </button>
          {message && <span className="text-sm">{message}</span>}
        </div>
      )}

      {coursId && etudiants.length === 0 && (
        <p className="text-gray-500 text-sm">Aucun étudiant dans cette classe.</p>
      )}
    </div>
  );
}