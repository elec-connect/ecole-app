import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const db = await getPrismaDynamic();
  const config = await getConfig();
  const annee = config.anneeScolaireCourante;

  // ==========================================
  // 1. RÉCUPÉRATION DES DONNÉES
  // ==========================================
  
  // Demandes d'inscription
  const nbDemandesEnAttente = await db.demandeInscription.count({
    where: { statut: 'EN_ATTENTE' },
  });
  
  const dernieresDemandes = await db.demandeInscription.findMany({
    where: { statut: 'EN_ATTENTE' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, nom: true, prenom: true, niveauDemande: true, createdAt: true },
  });

  // Statistiques globales
  const nbEleves = await db.user.count({ where: { role: 'ETUDIANT', actif: true } });
  const nbProfesseurs = await db.user.count({ where: { role: 'PROFESSEUR', actif: true } });
  
  // Absences (d'aujourd'hui et totales)
  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);
  const finJournee = new Date();
  finJournee.setHours(23, 59, 59, 999);

  const absencesAujourdhui = await db.presence.count({
    where: { 
      statut: 'ABSENT',
      date: { gte: debutJournee, lte: finJournee }
    }
  });

  const totalAbsences = await db.presence.count({ where: { statut: 'ABSENT' } });

  // ⭐ MODIFICATION : Uniquement les classes qui ont au moins un élève
  const classes = await db.classe.findMany({
    where: { 
      anneeScolaire: annee ?? undefined,
      inscriptions: { some: {} } // Garde uniquement les classes avec au moins 1 inscription
    },
    include: {
      _count: { select: { inscriptions: true } }
    },
    orderBy: { nom: 'asc' }
  });

  // Nombre total de classes (y compris vides), pour info dans le KPI
  const nbClassesTotal = await db.classe.count({ 
    where: { anneeScolaire: annee ?? undefined } 
  });

  const nbClassesActives = classes.length;

  // ==========================================
  // 2. RENDU VISUEL
  // ==========================================
  return (
    <div className="space-y-8">
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-1">
            Année scolaire <span className="font-semibold text-blue-600">{annee ?? 'Non définie'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-gray-600 font-medium">Système opérationnel</span>
        </div>
      </div>

      {/* ALERTES (si nécessaire) */}
      {nbDemandesEnAttente > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl opacity-30 -mr-10 -mt-10"></div>
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-xl text-2xl shadow-inner">📝</div>
              <div>
                <h2 className="font-bold text-lg text-amber-900">
                  {nbDemandesEnAttente} demande{nbDemandesEnAttente > 1 ? 's' : ''} d&apos;inscription en attente
                </h2>
                <p className="text-sm text-amber-800 mt-1">
                  Les parents attendent une validation. Traitez-les rapidement.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {dernieresDemandes.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-md text-xs font-medium text-amber-900 border border-amber-200">
                      {d.prenom} {d.nom} <span className="text-amber-600">({d.niveauDemande})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/admin/demandes-inscription"
              className="w-full md:w-auto text-center bg-amber-600 text-white px-6 py-2.5 rounded-xl hover:bg-amber-700 font-medium shadow-sm transition shrink-0"
            >
              Traiter les demandes
            </Link>
          </div>
        </div>
      )}

      {/* CARTES STATISTIQUES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Élèves actifs" 
          value={nbEleves.toString()} 
          icon="👨‍🎓" 
          color="blue" 
          href="/admin/utilisateurs?role=ETUDIANT"
        />
        <StatCard 
          title="Professeurs" 
          value={nbProfesseurs.toString()} 
          icon="👨‍🏫" 
          color="purple" 
          href="/admin/utilisateurs?role=PROFESSEUR"
        />
        {/* ⭐ KPI modifié : Classes actives + total */}
        <StatCard 
          title="Classes actives" 
          value={nbClassesActives.toString()} 
          icon="🏫" 
          color="green" 
          href="/admin/classes"
          subtitle={`${nbClassesTotal} au total`}
        />
        <StatCard 
          title="Absences aujourd'hui" 
          value={absencesAujourdhui.toString()} 
          icon="📋" 
          color={absencesAujourdhui > 0 ? "red" : "gray"}
          href="/admin/absences"
          subtitle={`${totalAbsences} au total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RÉPARTITION DES CLASSES (uniquement celles avec élèves) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>🏫</span> Répartition par classe
              <span className="text-xs font-normal text-gray-500">({classes.length} avec élèves)</span>
            </h2>
            <Link href="/admin/classes" className="text-xs font-medium text-blue-600 hover:text-blue-800">
              Gérer les classes →
            </Link>
          </div>
          
          <div className="p-5">
            {classes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                Aucune classe ne contient d&apos;élèves pour cette année.
                <br />
                <span className="text-xs">Les {nbClassesTotal} classes configurées sont vides.</span>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {c.nom.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.nom}</p>
                        <p className="text-xs text-gray-500">Niveau {c.niveau}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{c._count.inscriptions}</p>
                      <p className="text-xs text-gray-500">élève{c._count.inscriptions > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>⚡</span> Actions rapides
            </h2>
          </div>
          <div className="p-4 space-y-2 flex-1">
            <QuickAction href="/admin/emplois/generer" icon="🤖" label="Générer un emploi du temps" />
            <QuickAction href="/admin/cours" icon="📖" label="Ajouter un cours" />
            <QuickAction href="/admin/moyennes" icon="📈" label="Consulter les moyennes" />
            <QuickAction href="/admin/comptabilite" icon="💰" label="Gérer la comptabilité" />
            <QuickAction href="/admin/seances" icon="🕒" label="Valider les séances profs" />
            <QuickAction href="/admin/archives" icon="📦" label="Archives" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPOSANTS RÉUTILISABLES
// ==========================================

function StatCard({ title, value, icon, color, href, subtitle }: any) {
  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <Link href={href} className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${colorStyles[color] || colorStyles.gray}`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 transition group">
      <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
        {icon}
      </span>
      {label}
      <span className="ml-auto text-gray-300 group-hover:text-blue-500 transition">→</span>
    </Link>
  );
}