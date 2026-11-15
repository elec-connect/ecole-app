import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  ABSENT: { label: '❌ Absent', color: 'bg-red-100 text-red-700' },
  RETARD: { label: '⏱️ Retard', color: 'bg-amber-100 text-amber-700' },
  JUSTIFIE: { label: '📄 Justifié', color: 'bg-blue-100 text-blue-700' },
  PRESENT: { label: '✅ Présent', color: 'bg-green-100 text-green-700' },
};

export default async function AdminAbsencesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; classeId?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();

  // Filtre par statut (par défaut : toutes les absences et retards)
  const filtreStatut = params.statut as 'ABSENT' | 'RETARD' | 'JUSTIFIE' | 'TOUS' | undefined;
  const whereStatut =
    !filtreStatut || filtreStatut === 'TOUS'
      ? { statut: { in: ['ABSENT', 'RETARD', 'JUSTIFIE'] as any[] } }
      : { statut: filtreStatut as any };

  // Filtre par classe (optionnel)
  const whereClasse = params.classeId ? { cours: { classeId: params.classeId } } : {};

  const presences = await db.presence.findMany({
    where: { ...whereStatut, ...whereClasse },
    include: {
      etudiant: { select: { id: true, nom: true, prenom: true, emailParent: true } },
      cours: {
        include: {
          matiere: { select: { nom: true } },
          classe: { select: { id: true, nom: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
    take: 300,
  });

  // Récupérer toutes les classes pour le filtre
  const classes = await db.classe.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: 'asc' },
  });

  // Statistiques
  const nbAbsents = await db.presence.count({ where: { statut: 'ABSENT' } });
  const nbRetards = await db.presence.count({ where: { statut: 'RETARD' } });
  const nbJustifies = await db.presence.count({ where: { statut: 'JUSTIFIE' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📋 Absences et retards</h1>
        <p className="text-sm text-gray-500">
          Suivi des absences, retards et justificatifs des élèves.
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Absences</p>
          <p className="text-2xl font-bold text-red-600">{nbAbsents}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Retards</p>
          <p className="text-2xl font-bold text-amber-600">{nbRetards}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Justifiés</p>
          <p className="text-2xl font-bold text-blue-600">{nbJustifies}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 text-sm flex-wrap items-center">
        <span className="text-gray-500">Statut :</span>
        <Link
          href="/admin/absences"
          className={`px-3 py-1 rounded-full ${!filtreStatut || filtreStatut === 'TOUS' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Tous
        </Link>
        <Link
          href="/admin/absences?statut=ABSENT"
          className={`px-3 py-1 rounded-full ${filtreStatut === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}
        >
          Absences ({nbAbsents})
        </Link>
        <Link
          href="/admin/absences?statut=RETARD"
          className={`px-3 py-1 rounded-full ${filtreStatut === 'RETARD' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'}`}
        >
          Retards ({nbRetards})
        </Link>
        <Link
          href="/admin/absences?statut=JUSTIFIE"
          className={`px-3 py-1 rounded-full ${filtreStatut === 'JUSTIFIE' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}
        >
          Justifiés ({nbJustifies})
        </Link>
      </div>

      {/* Filtre par classe */}
      <div className="flex gap-2 text-sm flex-wrap items-center">
        <span className="text-gray-500">Classe :</span>
        <Link
          href={`/admin/absences${filtreStatut ? `?statut=${filtreStatut}` : ''}`}
          className={`px-3 py-1 rounded-full ${!params.classeId ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          Toutes
        </Link>
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/admin/absences?${filtreStatut ? `statut=${filtreStatut}&` : ''}classeId=${c.id}`}
            className={`px-3 py-1 rounded-full ${params.classeId === c.id ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
          >
            {c.nom}
          </Link>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {presences.length === 0 ? (
          <p className="p-8 text-sm text-gray-500 text-center">
            Aucune absence ou retard enregistré pour ces filtres.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Élève</th>
                <th className="p-3 text-left">Classe</th>
                <th className="p-3 text-left">Matière</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Parent</th>
              </tr>
            </thead>
            <tbody>
              {presences.map((p) => {
                const statutInfo = STATUT_LABELS[p.statut] ?? STATUT_LABELS.ABSENT;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">
                      {p.date.toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3 font-medium">
                      {p.etudiant.prenom} {p.etudiant.nom}
                    </td>
                    <td className="p-3">{p.cours.classe.nom}</td>
                    <td className="p-3">{p.cours.matiere.nom}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutInfo.color}`}>
                        {statutInfo.label}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {p.etudiant.emailParent ?? <span className="text-red-500">Non renseigné</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {presences.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          {presences.length} enregistrement(s) affiché(s)
        </p>
      )}
    </div>
  );
}