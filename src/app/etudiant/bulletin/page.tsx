import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { calculerBulletin } from '@/lib/bulletin';
import { BulletinComplet } from '@/components/bulletin/BulletinComplet';
import Link from 'next/link';

export default async function EtudiantBulletinPage() {
  const session = await getSession();
  if (!session || session.role !== 'ETUDIANT') redirect('/login');

  const data = await calculerBulletin(session.id);

  // ⭐ CAS : pas de classe assignée
  if (!data.classe) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon bulletin</h1>
          <p className="text-gray-500 mt-1">Bulletin détaillé avec toutes les notes</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-lg font-semibold text-orange-900">
                Aucune classe assignée
              </h2>
              <p className="text-sm text-orange-700 mt-1">
                Vous n&apos;êtes inscrit dans aucune classe pour le moment.
                Contactez l&apos;administration pour régulariser votre situation.
              </p>
              <p className="text-xs text-orange-600 mt-2">
                Compte : {data.eleve.email}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Accès rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/etudiant/notes"
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              <p className="font-medium text-blue-900">📝 Mes notes</p>
              <p className="text-xs text-blue-700 mt-1">Toutes mes évaluations</p>
            </Link>
            <Link
              href="/etudiant/absences"
              className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
            >
              <p className="font-medium text-orange-900">📅 Mes absences</p>
              <p className="text-xs text-orange-700 mt-1">Détail des absences</p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cas normal : bulletin complet
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon bulletin</h1>
        <p className="text-gray-500 mt-1">
          {data.classe.nom} — {data.classe.anneeScolaire}
        </p>
      </div>
      <BulletinComplet
        data={data}
        etudiantId={session.id}
        anneeScolaire={data.classe.anneeScolaire}
      />
    </div>
  );
}