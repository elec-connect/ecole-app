'use client';

import { useState, useEffect } from 'react';

type Classe = { id: string; nom: string; niveau: string };
type Matiere = { id: string; nom: string; coefficient: number };

export default function VolumeHorairePage() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [classeId, setClasseId] = useState('');
  const [heures, setHeures] = useState<Record<string, string>>({});
  const [coefs, setCoefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState(0);

  async function chargerListes() {
    const [rc, rm] = await Promise.all([fetch('/api/classes'), fetch('/api/matieres')]);
    setClasses(await rc.json());
    setMatieres(await rm.json());
  }

  async function chargerVolumes(id: string) {
    if (!id) { setHeures({}); setCoefs({}); setTotal(0); return; }
    const res = await fetch('/api/volume-horaire?classeId=' + id);
    const data = await res.json();
    const h: Record<string, string> = {};
    const c: Record<string, string> = {};
    data.matieres.forEach((m: Matiere) => {
      h[m.id] = '0';
      c[m.id] = String(m.coefficient);
    });
    data.volumes.forEach((v: any) => {
      h[v.matiereId] = String(v.heures);
      c[v.matiereId] = String(v.coefficient);
    });
    setHeures(h);
    setCoefs(c);
    recalculer(h);
  }

  function recalculer(h: Record<string, string>) {
    let t = 0;
    Object.values(h).forEach((v) => { t += parseInt(v) || 0; });
    setTotal(t);
  }

  useEffect(() => { chargerListes(); }, []);
  useEffect(() => { chargerVolumes(classeId); }, [classeId]);

  function setHeure(matiereId: string, valeur: string) {
    const newHeures = { ...heures, [matiereId]: valeur };
    setHeures(newHeures);
    recalculer(newHeures);
  }

  function setCoef(matiereId: string, valeur: string) {
    setCoefs({ ...coefs, [matiereId]: valeur });
  }

  async function enregistrer() {
    if (!classeId) { setMessage('❌ Sélectionnez une classe'); return; }
    setLoading(true);
    setMessage('');

    const volumes = Object.entries(heures)
      .filter(([, v]) => parseInt(v) > 0)
      .map(([matiereId, v]) => ({
        matiereId,
        heures: parseInt(v),
        coefficient: parseInt(coefs[matiereId] || '1'),
      }));

    const res = await fetch('/api/volume-horaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classeId, volumes }),
    });

    setLoading(false);
    setMessage(res.ok ? '✅ Volume horaire + coefficients enregistrés' : '❌ Erreur');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Volume horaire & coefficients</h1>
        <p className="text-gray-500 mt-1">
          Pour chaque classe, définissez les heures par semaine ET le coefficient de chaque matière
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
          <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Sélectionner —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
          </select>
        </div>

        {classeId && (
          <>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Total :</strong> {total}h / semaine
                {total > 35 && <span className="text-red-600 ml-2">⚠️ Plus de 35h !</span>}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Matière</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Coef. global</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-32">Heures/sem</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-32">Coef. classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matieres.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium">{m.nom}</td>
                      <td className="px-4 py-2 text-sm text-center text-gray-400">{m.coefficient}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="12"
                          value={heures[m.id] ?? '0'}
                          onChange={(e) => setHeure(m.id, e.target.value)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={coefs[m.id] ?? String(m.coefficient)}
                          onChange={(e) => setCoef(m.id, e.target.value)}
                          className="w-20 border border-blue-300 rounded px-2 py-1 text-sm text-center bg-blue-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={enregistrer} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Enregistrement...' : 'Enregistrer heures + coefficients'}
              </button>
              {message && <span className="text-sm">{message}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}