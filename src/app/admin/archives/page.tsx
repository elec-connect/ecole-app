'use client';

import { useState, useEffect, useMemo } from 'react';

type Classe = {
  id: string;
  nom: string;
  niveau: string;
  anneeScolaire: string;
  professeurPrincipal?: { id: string; nom: string; prenom: string } | null;
  _count: { inscriptions: number; cours: number };
};

type Stats = {
  nbClasses: number;
  nbEleves: number;
  nbCours: number;
  nbNotes: number;
  nbPresences: number;
};

type Archive = {
  id: string;
  anneeScolaire: string;
  nom: string;
  type: string;
  format: string;
  nbClasses: number;
  nbEleves: number;
  nbNotes: number;
  createdAt: string;
};

type Onglet = 'supprimer' | 'archives';

export default function ArchivesPage() {
  const [onglet, setOnglet] = useState<Onglet>('supprimer');

  const [annees, setAnnees] = useState<string[]>([]);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<string>('');
  const [classes, setClasses] = useState<Classe[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [archives, setArchives] = useState<Archive[]>([]);
  const [filtreAnneeArchive, setFiltreAnneeArchive] = useState<string>('TOUTES');

  // Charger les années + archives au démarrage
  useEffect(() => {
    fetch('/api/archives')
      .then((r) => r.json())
      .then((data) => setAnnees(data.annees ?? []));
    chargerArchives();
  }, []);

  async function chargerArchives() {
    const res = await fetch('/api/archives/liste');
    if (res.ok) setArchives(await res.json());
  }

  // Charger les classes quand l'année change
  useEffect(() => {
    if (!anneeSelectionnee) {
      setClasses([]);
      setStats(null);
      setSelection([]);
      return;
    }
    setLoading(true);
    fetch('/api/archives?annee=' + encodeURIComponent(anneeSelectionnee))
      .then((r) => r.json())
      .then((data) => {
        setClasses(data.classes ?? []);
        setStats(data.stats ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [anneeSelectionnee]);

  const classesTriees = useMemo(() => {
    return [...classes].sort((a, b) =>
      (a.niveau + a.nom).localeCompare(b.niveau + b.nom)
    );
  }, [classes]);

  const archivesFiltrees = useMemo(() => {
    if (filtreAnneeArchive === 'TOUTES') return archives;
    return archives.filter((a) => a.anneeScolaire === filtreAnneeArchive);
  }, [archives, filtreAnneeArchive]);

  const anneesArchives = useMemo(() => {
    return Array.from(new Set(archives.map((a) => a.anneeScolaire))).sort().reverse();
  }, [archives]);

  function toggleClasse(id: string) {
    setSelection((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  function toggleTout() {
    setSelection((s) =>
      s.length === classes.length ? [] : classes.map((c) => c.id)
    );
  }

  // ============================================================
  // EXPORT CSV + JSON
  // ============================================================
  async function exporter() {
    if (!anneeSelectionnee) return;
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/archives/exporter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anneeScolaire: anneeSelectionnee }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage('❌ ' + (data.erreur ?? 'Erreur'));
      return;
    }

    // Télécharger le CSV
    const blobCSV = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
    const urlCSV = URL.createObjectURL(blobCSV);
    const aCSV = document.createElement('a');
    aCSV.href = urlCSV;
    aCSV.download = data.nomFichierCSV;
    aCSV.click();
    URL.revokeObjectURL(urlCSV);

    // Télécharger le JSON
    const blobJSON = new Blob([data.json], { type: 'application/json;charset=utf-8;' });
    const urlJSON = URL.createObjectURL(blobJSON);
    const aJSON = document.createElement('a');
    aJSON.href = urlJSON;
    aJSON.download = data.nomFichierJSON;
    aJSON.click();
    URL.revokeObjectURL(urlJSON);

    setMessage(
      `✅ Archive créée : ${data.stats.nbNotes} notes, ${data.stats.nbPresences} présences, ` +
      `${data.stats.nbEleves} élèves. Fichiers CSV et JSON téléchargés.`
    );
    chargerArchives();
  }

  // ============================================================
  // EXPORT PDF DES BULLETINS
  // ============================================================
  async function exporterPDF() {
    if (!anneeSelectionnee) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/archives/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anneeScolaire: anneeSelectionnee }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage('❌ ' + (data.erreur ?? 'Erreur'));
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletins-${anneeSelectionnee.replace(/[^a-z0-9]/gi, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage('✅ PDF des bulletins téléchargé');
    } catch (e: any) {
      setMessage('❌ ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // SUPPRESSION AVEC ARCHIVAGE AUTO
  // ============================================================
  async function confirmerSuppression() {
    setShowConfirm(false);
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/archives/supprimer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classeIds: selection, archiverAvant: true }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage('❌ ' + (data.erreur ?? 'Erreur'));
      return;
    }

    const d = data.details;
    setMessage(
      `✅ ${data.nbSupprimees} classe(s) supprimée(s). Archive créée automatiquement ` +
      `(${data.archiveStats?.nbNotes ?? d.nbNotes} notes sauvegardées). ` +
      `${d.nbPresences} présence(s), ${d.nbEvaluations} évaluation(s), ${d.nbDevoirs} devoir(s) effacés.`
    );
    setSelection([]);

    // Recharger les classes
    const r = await fetch('/api/archives?annee=' + encodeURIComponent(anneeSelectionnee));
    const refresh = await r.json();
    setClasses(refresh.classes ?? []);
    setStats(refresh.stats ?? null);
    chargerArchives();
  }

  // ============================================================
  // NETTOYAGE DES ARCHIVES > 10 ANS
  // ============================================================
  async function nettoyerArchives() {
    if (!confirm('Supprimer toutes les archives de plus de 10 ans ? Cette action est irréversible.')) {
      return;
    }
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/archives/nettoyer', { method: 'POST' });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage('❌ ' + (data.erreur ?? 'Erreur'));
      return;
    }

    setMessage(
      data.nbSupprimees > 0
        ? `✅ ${data.nbSupprimees} archive(s) de plus de 10 ans supprimée(s).`
        : '✅ Aucune archive de plus de 10 ans à supprimer.'
    );
    chargerArchives();
  }

  // ============================================================
  // SUPPRIMER UNE ARCHIVE MANUELLEMENT
  // ============================================================
  async function supprimerArchive(id: string) {
    if (!confirm('Supprimer cette archive ? Cette action est irréversible.')) return;
    const res = await fetch('/api/archives/liste?id=' + id, { method: 'DELETE' });
    if (res.ok) chargerArchives();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📦 Archives</h1>
        <p className="text-gray-500 mt-1">
          Archiver et supprimer les données d'une année scolaire
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setOnglet('supprimer')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 transition ' +
            (onglet === 'supprimer'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-900')
          }
        >
          🗑️ Archiver & Supprimer
        </button>
        <button
          onClick={() => setOnglet('archives')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 transition ' +
            (onglet === 'archives'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-900')
          }
        >
          📁 Archives sauvegardées ({archives.length})
        </button>
      </div>

      {/* ============================================================ */}
      {/* ONGLET 1 : SUPPRIMER */}
      {/* ============================================================ */}
      {onglet === 'supprimer' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Année scolaire à archiver / supprimer
            </label>
            <div className="flex flex-wrap gap-3">
              <select
                value={anneeSelectionnee}
                onChange={(e) => setAnneeSelectionnee(e.target.value)}
                className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Sélectionner une année —</option>
                {annees.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {anneeSelectionnee && classes.length > 0 && (
                <>
                  <button
                    onClick={exporter}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {loading ? 'Export...' : '📥 Exporter (CSV + JSON)'}
                  </button>
                  <button
                    onClick={exporterPDF}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {loading ? 'PDF...' : '📄 Exporter bulletins PDF'}
                  </button>
                </>
              )}
            </div>
            {annees.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Aucune année scolaire enregistrée.
              </p>
            )}
          </div>

          {/* Stats de l'année */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-2xl font-bold text-blue-700">{stats.nbClasses}</p>
                <p className="text-xs text-blue-700 uppercase">Classes</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-2xl font-bold text-green-700">{stats.nbEleves}</p>
                <p className="text-xs text-green-700 uppercase">Élèves</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-2xl font-bold text-purple-700">{stats.nbCours}</p>
                <p className="text-xs text-purple-700 uppercase">Cours</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-2xl font-bold text-orange-700">{stats.nbNotes}</p>
                <p className="text-xs text-orange-700 uppercase">Notes</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-2xl font-bold text-red-700">{stats.nbPresences}</p>
                <p className="text-xs text-red-700 uppercase">Présences</p>
              </div>
            </div>
          )}

          {anneeSelectionnee && (
            <>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Chargement…</div>
              ) : classes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                  <p className="text-gray-500 text-sm">
                    Aucune classe pour l'année {anneeSelectionnee}.
                  </p>
                </div>
              ) : (
                <>
                  {/* Barre d'actions */}
                  <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <button
                      onClick={toggleTout}
                      className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      {selection.length === classes.length
                        ? 'Désélectionner tout'
                        : 'Tout sélectionner'}
                    </button>
                    <span className="text-sm text-gray-600">
                      {selection.length} / {classes.length} classe(s) sélectionnée(s)
                    </span>
                    {selection.length > 0 && (
                      <button
                        onClick={() => setShowConfirm(true)}
                        className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        🗑️ Supprimer les {selection.length} classes sélectionnées
                      </button>
                    )}
                  </div>

                  {/* Tableau des classes */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-center px-3 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={selection.length === classes.length && classes.length > 0}
                              onChange={toggleTout}
                              className="rounded"
                            />
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Classe
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Niveau
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Prof. principal
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Élèves
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Cours
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classesTriees.map((c) => (
                          <tr
                            key={c.id}
                            className={
                              'hover:bg-gray-50 ' +
                              (selection.includes(c.id) ? 'bg-red-50' : '')
                            }
                          >
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selection.includes(c.id)}
                                onChange={() => toggleClasse(c.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{c.nom}</td>
                            <td className="px-4 py-3 text-sm">{c.niveau}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {c.professeurPrincipal
                                ? `${c.professeurPrincipal.prenom} ${c.professeurPrincipal.nom}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                                {c._count.inscriptions}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                                {c._count.cours}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {message && (
            <div
              className={
                'p-3 rounded ' +
                (message.startsWith('✅')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700')
              }
            >
              {message}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* ONGLET 2 : ARCHIVES SAUVEGARDEES */}
      {/* ============================================================ */}
      {onglet === 'archives' && (
        <>
          {/* Barre d'actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filtrer par année :</label>
            <select
              value={filtreAnneeArchive}
              onChange={(e) => setFiltreAnneeArchive(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="TOUTES">Toutes les années ({archives.length})</option>
              {anneesArchives.map((a) => (
                <option key={a} value={a}>
                  {a} ({archives.filter((ar) => ar.anneeScolaire === a).length})
                </option>
              ))}
            </select>

            <button
              onClick={nettoyerArchives}
              disabled={loading}
              className="ml-auto bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Nettoyage...' : '🧹 Nettoyer les archives > 10 ans'}
            </button>
          </div>

          {archivesFiltrees.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-gray-500 text-sm">
                {archives.length === 0
                  ? 'Aucune archive sauvegardée.'
                  : 'Aucune archive pour cette année.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivesFiltrees.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4"
                >
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-gray-900">{a.nom}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(a.createdAt).toLocaleString('fr-FR')} · {a.type} · {a.format.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {a.nbClasses} classe(s)
                    </span>
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                      {a.nbEleves} élève(s)
                    </span>
                    <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded">
                      {a.nbNotes} note(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={'/api/archives/telecharger?id=' + a.id}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      📥 Télécharger
                    </a>
                    <button
                      onClick={() => supprimerArchive(a.id)}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {message && (
            <div
              className={
                'p-3 rounded ' +
                (message.startsWith('✅')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700')
              }
            >
              {message}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMATION */}
      {/* ============================================================ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-red-600">
              ⚠️ Confirmation de suppression
            </h2>
            <p className="text-sm text-gray-700">
              Vous allez <strong>archiver automatiquement</strong> puis supprimer{' '}
              <strong>{selection.length} classe(s)</strong> de{' '}
              <strong>{anneeSelectionnee}</strong>.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 space-y-1">
              <p className="font-medium">📁 Archive automatique :</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>{stats?.nbNotes ?? 0} note(s) sauvegardées</li>
                <li>{stats?.nbPresences ?? 0} présence(s) sauvegardées</li>
                <li>{stats?.nbEleves ?? 0} élève(s) sauvegardés</li>
                <li>Consultable et téléchargeable dans l'onglet "Archives"</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <p className="font-semibold">
                ⚠️ Les classes et leurs données seront ensuite supprimées définitivement.
              </p>
              <p className="text-xs mt-1">
                Les comptes utilisateurs (élèves, profs) ne sont pas supprimés, seules les
                données liées à ces classes le sont.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={confirmerSuppression}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Traitement...' : 'Archiver et supprimer'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}