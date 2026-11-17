'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AffectationPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [eleves, setEleves] = useState<any[]>([]);
  const [classeSourceId, setClasseSourceId] = useState('');
  const [classeDestinationId, setClasseDestinationId] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []));
  }, []);

  // Charger les élèves de la classe source
  useEffect(() => {
    if (!classeSourceId) {
      setEleves([]);
      setSelection([]);
      return;
    }
    setLoading(true);
    fetch(`/api/classes/${classeSourceId}/eleves`)
      .then((r) => r.json())
      .then((data) => {
        setEleves(Array.isArray(data) ? data : []);
        setSelection([]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [classeSourceId]);

  function toggleEleve(id: string) {
    setSelection((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  function toggleTout() {
    setSelection((s) =>
      s.length === eleves.length ? [] : eleves.map((e) => e.id)
    );
  }

  async function transferer() {
    if (selection.length === 0) {
      setMessage('❌ Sélectionnez au moins un élève.');
      return;
    }
    if (!classeDestinationId) {
      setMessage('❌ Sélectionnez une classe de destination.');
      return;
    }
    if (classeSourceId === classeDestinationId) {
      setMessage('❌ La classe source et la destination doivent être différentes.');
      return;
    }

    setLoading(true);
    setMessage('');

    const classeSource = classes.find((c) => c.id === classeSourceId);

    try {
      const res = await fetch('/api/inscriptions/transferer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etudiantIds: selection,
          classeSourceId,
          classeDestinationId,
          anneeScolaire: classeSource?.anneeScolaire,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        // Recharger les élèves de la source
        const r = await fetch(`/api/classes/${classeSourceId}/eleves`);
        if (r.ok) setEleves(await r.json());
        setSelection([]);
      } else {
        setMessage(`❌ ${data.erreur || 'Erreur lors du transfert'}`);
      }
    } catch (e) {
      setMessage('❌ Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const classeDestination = classes.find((c) => c.id === classeDestinationId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/admin/classes" className="text-sm text-blue-600 hover:underline">
        ← Retour aux classes
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔀 Changer un élève de classe</h1>
        <p className="text-gray-500 mt-1">
          Sélectionnez une classe source, cochez les élèves à transférer, puis choisissez la classe de destination.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Sélection source / destination */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            1. Classe source (actuelle)
          </label>
          <select
            value={classeSourceId}
            onChange={(e) => setClasseSourceId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Sélectionner —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} ({c._count?.inscriptions || 0} élèves)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            2. Classe de destination (nouvelle)
          </label>
          <select
            value={classeDestinationId}
            onChange={(e) => setClasseDestinationId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Sélectionner —</option>
            {classes
              .filter((c) => c.id !== classeSourceId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c._count?.inscriptions || 0} élèves)
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Liste des élèves */}
      {classeSourceId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Élèves de la classe ({eleves.length})
            </h2>
            {eleves.length > 0 && (
              <button
                onClick={toggleTout}
                className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
              >
                {selection.length === eleves.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>

          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : eleves.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucun élève dans cette classe.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3 text-left">Élève</th>
                  <th className="p-3 text-left">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eleves.map((e) => (
                  <tr key={e.id} className={selection.includes(e.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selection.includes(e.id)}
                        onChange={() => toggleEleve(e.id)}
                        className="rounded w-4 h-4"
                      />
                    </td>
                    <td className="p-3 font-medium">{e.prenom} {e.nom}</td>
                    <td className="p-3 text-gray-500">{e.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bouton de transfert */}
      {classeSourceId && eleves.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>{selection.length}</strong> élève(s) sélectionné(s)
            {classeDestination && (
              <> → vers <strong className="text-blue-700">{classeDestination.nom}</strong></>
            )}
          </div>
          <button
            onClick={transferer}
            disabled={loading || selection.length === 0 || !classeDestinationId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Transfert...' : '🔀 Transférer les élèves'}
          </button>
        </div>
      )}
    </div>
  );
}