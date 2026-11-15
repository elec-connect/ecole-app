import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/config';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ComptabilitePage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const config = await getConfig();
  const annee = config.anneeScolaireCourante ?? 'Non configurée';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💰 Comptabilité — {annee}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choisissez une section à gérer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carte Élèves */}
        <Link
          href="/admin/comptabilite/eleves"
          className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="text-4xl mb-3">👨‍🎓</div>
          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700">
            Élèves
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Frais de scolarité mensuels, paiements et reçus PDF.
          </p>
          <div className="mt-4 text-sm text-blue-600 font-medium">
            Gérer les élèves →
          </div>
        </Link>

        {/* Carte Professeurs */}
        <Link
          href="/admin/comptabilite/professeurs"
          className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-purple-400 hover:shadow-md transition group"
        >
          <div className="text-4xl mb-3">👨‍🏫</div>
          <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-700">
            Professeurs
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Taux horaires, paie mensuelle et fiches de paie PDF.
          </p>
          <div className="mt-4 text-sm text-purple-600 font-medium">
            Gérer les professeurs →
          </div>
        </Link>
      </div>
    </div>
  );
}