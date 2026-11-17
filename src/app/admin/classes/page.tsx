'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const NIVEAUX = [
  // Primaire
  { value: '1ere_primaire', label: '1ère année primaire' },
  { value: '2eme_primaire', label: '2ème année primaire' },
  { value: '3eme_primaire', label: '3ème année primaire' },
  { value: '4eme_primaire', label: '4ème année primaire' },
  { value: '5eme_primaire', label: '5ème année primaire' },
  { value: '6eme_primaire', label: '6ème année primaire' },
  // Secondaire
  { value: '7eme', label: '7ème année' },
  { value: '8eme', label: '8ème année' },
  { value: '9eme', label: '9ème année' },
  { value: '1ere', label: '1ère année sec.' },
  { value: '2eme', label: '2ème année sec.' },
  { value: '3eme', label: '3ème année sec.' },
  { value: '4eme', label: '4ème année sec.' },
];

const SUFFIXES = ['A', 'B', 'C', 'D', 'E'];

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États du formulaire
  const [niveau, setNiveau] = useState('');
  const [suffixe, setSuffixe] = useState('');
  const [anneeScolaire, setAnneeScolaire] = useState('2026-2027');
  const [profPrincipalId, setProfPrincipalId] = useState('');
  
  const [professeurs, setProfesseurs] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [masquerVides, setMasquerVides] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [resClasses, resProfs] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/utilisateurs?role=PROFESSEUR')
      ]);
      
      if (resClasses.ok) setClasses(await resClasses.json());
      if (resProfs.ok) setProfesseurs(await resProfs.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function creerClasse(e: React.FormEvent) {
    e.preventDefault();
    if (!niveau || !suffixe) {
      setMessage('❌ Veuillez sélectionner un niveau et une section.');
      return;
    }

    const niveauLabel = NIVEAUX.find(n => n.value === niveau)?.label.split(' ')[0] || niveau;
    const nomComplet = `${niveauLabel} ${suffixe}`;

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: nomComplet,
        niveau,
        anneeScolaire,
        professeurPrincipalId: profPrincipalId || null,
      }),
    });

    if (res.ok) {
      setMessage('✅ Classe créée avec succès');
      setNiveau('');
      setSuffixe('');
      setProfPrincipalId('');
      fetchData();
    } else {
      const data = await res.json();
      setMessage(`❌ Erreur : ${data.erreur || 'Inconnue'}`);
    }
  }

  async function genererClasses() {
    if (!confirm('Générer automatiquement les 5 classes (A, B, C, D, E) pour chaque niveau ?\n\nLes niveaux qui ont déjà des classes ne seront pas régénérés.')) {
      return;
    }

    setGenerating(true);
    setMessage('');
    try {
      const res = await fetch('/api/classes/generer', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        fetchData();
      } else {
        setMessage(`❌ ${data.erreur || 'Erreur lors de la génération'}`);
      }
    } catch (e) {
      setMessage('❌ Erreur réseau lors de la génération');
    } finally {
      setGenerating(false);
    }
  }

  async function supprimerClasse(id: string) {
    if (!confirm('Supprimer cette classe ?')) return;
    const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  }

  async function supprimerTout() {
    if (!confirm('⚠️ ATTENTION : Supprimer TOUTES les classes ? Cette action est irréversible et supprimera aussi les inscriptions liées.')) return;
    if (!confirm('Dernière confirmation : Toutes les classes seront définitivement supprimées. Confirmer ?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/classes?all=true', { method: 'DELETE' });
      if (res.ok) {
        setMessage('✅ Toutes les classes ont été supprimées.');
        fetchData();
      } else {
        setMessage('❌ Erreur lors de la suppression globale.');
      }
    } catch (e) {
      setMessage('❌ Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const classesFiltrees = masquerVides
    ? classes.filter((c) => (c._count?.inscriptions ?? 0) > 0)
    : classes;

  const nbVides = classes.filter((c) => (c._count?.inscriptions ?? 0) === 0).length;
  const nbNonVides = classes.length - nbVides;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🏫 Classes</h1>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          {classesFiltrees.length} / {classes.length} classe(s)
        </span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Barre d'actions rapides */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <button
          onClick={genererClasses}
          disabled={generating || loading}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
          {generating ? '⏳ Génération...' : '⚡ Générer les 5 classes par niveau'}
        </button>

        {/* ⭐ NOUVEAU : Lien vers la page d'affectation */}
        <Link
          href="/admin/classes/affectation"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          🔀 Changer un élève de classe
        </Link>

        <button
          onClick={supprimerTout}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
        >
          🗑️ Supprimer tout
        </button>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {nbNonVides} avec élèves · {nbVides} vides
          </span>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={masquerVides}
              onChange={(e) => setMasquerVides(e.target.checked)}
              className="rounded w-4 h-4"
            />
            <span className="text-gray-700 font-medium">Masquer les classes vides</span>
          </label>
        </div>
      </div>

      {/* Formulaire de création manuelle */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-4">➕ Nouvelle classe (manuelle)</h2>
        <form onSubmit={creerClasse} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
            <select
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">Sélectionner un niveau</option>
              {NIVEAUX.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={suffixe}
              onChange={(e) => setSuffixe(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              disabled={!niveau}
            >
              <option value="">Sélectionner</option>
              {SUFFIXES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire</label>
            <input
              type="text"
              value={anneeScolaire}
              onChange={(e) => setAnneeScolaire(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prof. principal (optionnel)</label>
            <select
              value={profPrincipalId}
              onChange={(e) => setProfPrincipalId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">— Aucun —</option>
              {professeurs.map((p) => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex justify-end">
             <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Créer la classe
            </button>
          </div>
        </form>
      </div>

      {/* Tableau des classes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-left font-semibold text-gray-700">Classe</th>
              <th className="p-4 text-left font-semibold text-gray-700">Niveau</th>
              <th className="p-4 text-left font-semibold text-gray-700">Année</th>
              <th className="p-4 text-left font-semibold text-gray-700">Prof. principal</th>
              <th className="p-4 text-center font-semibold text-gray-700">Élèves</th>
              <th className="p-4 text-center font-semibold text-gray-700">Cours</th>
              <th className="p-4 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">Chargement...</td></tr>
            ) : classesFiltrees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  {masquerVides && classes.length > 0
                    ? 'Aucune classe avec des élèves (toutes les classes sont vides). Décochez "Masquer les classes vides" pour les voir.'
                    : 'Aucune classe enregistrée.'}
                </td>
              </tr>
            ) : (
              classesFiltrees.map((c) => {
                const nbEleves = c._count?.inscriptions || c.inscriptions?.length || 0;
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">
                      {c.nom}{' '}
                      {nbEleves === 0 && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          vide
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">{c.niveau}</td>
                    <td className="p-4 text-gray-600">{c.anneeScolaire}</td>
                    <td className="p-4 text-gray-600">
                      {c.professeurPrincipal ? `${c.professeurPrincipal.prenom} ${c.professeurPrincipal.nom}` : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        nbEleves > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {nbEleves}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">
                        {c._count?.cours || c.cours?.length || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => supprimerClasse(c.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition text-xs font-medium"
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}