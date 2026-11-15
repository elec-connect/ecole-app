import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { ReinitialisationClient } from './ReinitialisationClient';

export const dynamic = 'force-dynamic';

export default async function ReinitialisationPage() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard');
  }

  const config = await getConfig();
  const anneeActuelle = config.anneeScolaireCourante ?? 'Non configurée';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ⚠️ Réinitialisation de l'année scolaire
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Action réservée au <strong>Super Administrateur</strong>.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-semibold text-lg">📅 Année scolaire en cours</h2>
        <p className="text-2xl font-bold text-blue-700">{anneeActuelle}</p>
        <p className="text-sm text-gray-600">
          Cette action va :
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Créer une archive complète (classes, élèves, cours, professeurs, notes)</li>
          <li>Supprimer toutes les classes de l'année {anneeActuelle}</li>
          <li>Supprimer tous les emplois du temps de l'année {anneeActuelle}</li>
          <li>Supprimer toutes les inscriptions (élèves ↔ classes) de l'année {anneeActuelle}</li>
          <li>Supprimer toutes les notes et présences liées</li>
          <li>Désactiver les comptes professeurs (ils restent en base mais ne peuvent plus se connecter)</li>
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p className="font-medium">⚠️ Important</p>
          <p>
            Les données seront conservées dans la section <strong>Archives</strong> sous forme
            de fichier JSON. Vous pourrez les restaurer manuellement si besoin.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <p className="font-medium">🔴 Action irréversible</p>
          <p>
            Après suppression, vous devrez recréer les classes, matières, salles,
            utilisateurs et emplois du temps pour la nouvelle année. Faites une
            sauvegarde manuelle de la base Neon avant de continuer.
          </p>
        </div>
      </div>

      <ReinitialisationClient anneeActuelle={anneeActuelle} />
    </div>
  );
}