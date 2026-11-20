import { getSession } from '@/lib/auth';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AnnoncesEleve } from '@/components/AnnoncesEleve';

export const dynamic = 'force-dynamic'; // ⭐ Ajouté

export default async function EtudiantDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'ETUDIANT') redirect('/login');

  const db = await getPrismaDynamic();

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: {
      inscriptions: {
        include: { classe: true },
        orderBy: { anneeScolaire: 'desc' },
        take: 1,
      },
    },
  });

  const notes = await db.note.findMany({ where: { etudiantId: session.id } });
  const absences = await db.presence.count({
    where: { etudiantId: session.id, statut: 'ABSENT' },
  });

  // ⭐ Compter les devoirs en attente
  const classe = user?.inscriptions[0]?.classe;
  let nbDevoirs = 0;
  if (classe) {
    nbDevoirs = await db.devoir.count({
      where: {
        cours: { classeId: classe.id },
        deadline: { gte: new Date() },
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.prenom} 👋</h1>
        <p className="text-gray-500 mt-1">
          {classe ? classe.nom + ' (' + classe.niveau + ')' : 'Aucune classe'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <p className="text-3xl font-bold text-blue-600">{notes.length}</p>
          <p className="text-sm text-gray-600 mt-1">Notes enregistrées</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
          <p className="text-3xl font-bold text-orange-600">{absences}</p>
          <p className="text-sm text-gray-600 mt-1">Absences</p>
        </div>
        {/* ⭐ NOUVEAU : Devoirs en attente */}
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
          <p className="text-3xl font-bold text-purple-600">{nbDevoirs}</p>
          <p className="text-sm text-gray-600 mt-1">Devoirs à rendre</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <p className="text-3xl font-bold text-green-600">📚</p>
          <p className="text-sm text-gray-600 mt-1">Mon parcours</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accès rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Link href="/etudiant/notes" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
            <p className="font-medium text-blue-900">📝 Mes notes</p>
            <p className="text-xs text-blue-700 mt-1">Toutes mes évaluations</p>
          </Link>
          <Link href="/etudiant/absences" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition">
            <p className="font-medium text-orange-900">📅 Mes absences</p>
            <p className="text-xs text-orange-700 mt-1">Détail des absences</p>
          </Link>
          {/* ⭐ NOUVEAU : Lien vers les devoirs */}
          <Link href="/etudiant/devoirs" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
            <p className="font-medium text-purple-900">📚 Mes devoirs</p>
            <p className="text-xs text-purple-700 mt-1">{nbDevoirs} devoir(s) à rendre</p>
          </Link>
          <Link href="/etudiant/bulletin" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
            <p className="font-medium text-green-900">📄 Mon bulletin</p>
            <p className="text-xs text-green-700 mt-1">Bulletin imprimable</p>
          </Link>
        </div>
      </div>
      {/* ⭐ Annonces des professeurs */}
{classe && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 Annonces de mes professeurs</h2>
    <AnnoncesEleve classeId={classe.id} />
  </div>
)}
    </div>
  );
}