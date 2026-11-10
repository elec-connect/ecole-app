import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { calculerBulletin, verifierAccesParent } from '@/lib/bulletin';
import { BulletinComplet } from '@/components/bulletin/BulletinComplet';

export default async function ParentBulletinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'PARENT') redirect('/login');

  const { id } = await params;

  const aAcces = await verifierAccesParent(session.id, id);
  if (!aAcces) notFound();

  // Appel DIRECT (pas de fetch)
  const data = await calculerBulletin(id);

  // ⭐ CAS : pas de classe assignée
  if (!data.classe) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/parent/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Retour
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bulletin de {data.eleve.prenom} {data.eleve.nom}
          </h1>
          <p className="text-gray-500 mt-1">Aucune classe assignée</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-lg font-semibold text-orange-900">
                Aucune classe assignée
              </h2>
              <p className="text-sm text-orange-700 mt-1">
                Cet élève n&apos;est inscrit dans aucune classe pour le moment.
                Contactez l&apos;administration pour régulariser la situation.
              </p>
              <p className="text-xs text-orange-600 mt-2">
                Élève : {data.eleve.prenom} {data.eleve.nom} ({data.eleve.email})
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Accès rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href={`/parent/enfant/${id}/notes`}
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              <p className="font-medium text-blue-900">📝 Notes</p>
              <p className="text-xs text-blue-700 mt-1">Voir les notes</p>
            </Link>
            <Link
              href={`/parent/enfant/${id}/absences`}
              className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
            >
              <p className="font-medium text-orange-900">📅 Absences</p>
              <p className="text-xs text-orange-700 mt-1">Voir les absences</p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cas normal : bulletin complet
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/parent/dashboard"
        className="text-sm text-blue-600 hover:underline print:hidden"
      >
        ← Retour
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bulletin de {data.eleve.prenom} {data.eleve.nom}
        </h1>
        <p className="text-gray-500 mt-1">
          {data.classe.nom} — {data.classe.anneeScolaire}
        </p>
      </div>
      <BulletinComplet
        data={data}
        etudiantId={id}
        anneeScolaire={data.classe.anneeScolaire}
      />
    </div>
  );
}