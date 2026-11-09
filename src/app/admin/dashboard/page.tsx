import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import Link from 'next/link';

export default async function AdminDashboard() {
  const db = await getPrismaDynamic();

  const [nbEleves, nbProfs, nbClasses, nbMatieres, nbCours, nbNotes, nbAbsences] =
    await Promise.all([
      db.user.count({ where: { role: 'ETUDIANT', actif: true } }),
      db.user.count({ where: { role: 'PROFESSEUR', actif: true } }),
      db.classe.count(),
      db.matiere.count(),
      db.cours.count(),
      db.note.count(),
      db.presence.count({ where: { statut: 'ABSENT' } }),
    ]);

  const stats = [
    { label: 'Élèves', value: nbEleves, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Professeurs', value: nbProfs, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Classes', value: nbClasses, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Matières', value: nbMatieres, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Cours', value: nbCours, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Notes', value: nbNotes, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Absences', value: nbAbsences, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de l&apos;établissement</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-xl shadow-sm border border-gray-100 p-6`}
          >
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accès rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/admin/utilisateurs"
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <p className="font-medium text-blue-900">👥 Gérer les utilisateurs</p>
            <p className="text-xs text-blue-700 mt-1">Créer, modifier, désactiver</p>
          </Link>
          <Link
            href="/admin/classes"
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <p className="font-medium text-green-900">🏫 Gérer les classes</p>
            <p className="text-xs text-green-700 mt-1">Classes et inscriptions</p>
          </Link>
          <Link
            href="/admin/configuration"
            className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
          >
            <p className="font-medium text-orange-900">⚙️ Configuration</p>
            <p className="text-xs text-orange-700 mt-1">DB, JWT, SMTP</p>
          </Link>
        </div>
      </div>
    </div>
  );
}