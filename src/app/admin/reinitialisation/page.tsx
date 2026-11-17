import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { ReinitialisationClient } from './ReinitialisationClient';

export const dynamic = 'force-dynamic';

export default async function ReinitialisationPage() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard');
  }

  const config = await getConfig();
  const anneeCourante = config.anneeScolaireCourante ?? 'Non configurée';
  const db = await getPrismaDynamic();

  // Récupérer les années disponibles
  const classesAnnees = await db.classe.findMany({
    select: { anneeScolaire: true },
    distinct: ['anneeScolaire'],
  });
  const inscriptionsAnnees = await db.inscription.findMany({
    select: { anneeScolaire: true },
    distinct: ['anneeScolaire'],
  });
  
  const anneesSet = new Set([
    ...classesAnnees.map(c => c.anneeScolaire),
    ...inscriptionsAnnees.map(i => i.anneeScolaire),
    anneeCourante
  ]);
  const anneesDisponibles = Array.from(anneesSet).filter(a => a !== 'Non configurée').sort().reverse();

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
        <p className="text-2xl font-bold text-blue-700">{anneeCourante}</p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <p className="font-medium">🔴 Attention</p>
          <p>
            La réinitialisation supprime définitivement les données de l'année sélectionnée. 
            Assurez-vous d'avoir une sauvegarde.
          </p>
        </div>

        <ReinitialisationClient 
          anneesDisponibles={anneesDisponibles} 
          anneeCourante={anneeCourante} 
        />
      </div>
    </div>
  );
}