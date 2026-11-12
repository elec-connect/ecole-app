'use client';

import { useState, useEffect, useMemo } from 'react';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PROFESSEUR' | 'ETUDIANT' | 'PARENT';
type Matiere = { id: string; nom: string; coefficient: number };
type Classe = { id: string; nom: string; niveau: string; anneeScolaire: string };

type User = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: Role;
  actif: boolean;
  emailParent?: string | null;
  createdAt: string;
  matieres?: Matiere[];
  enfants?: { id: string; eleve: { id: string; nom: string; prenom: string; email: string } }[];
  inscriptions?: { id: string; classe: Classe }[];
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  PROFESSEUR: 'Professeur',
  ETUDIANT: 'Élève',
  PARENT: 'Parent',
};

const ROLE_COLOR: Record<Role, string> = {
  SUPER_ADMIN: 'bg-yellow-100 text-yellow-800',
  ADMIN: 'bg-red-100 text-red-700',
  PROFESSEUR: 'bg-blue-100 text-blue-700',
  ETUDIANT: 'bg-green-100 text-green-700',
  PARENT: 'bg-purple-100 text-purple-700',
};

const EMPTY_FORM = {
  id: '',
  email: '',
  motDePasse: '',
  nom: '',
  prenom: '',
  role: 'ETUDIANT' as Role,
  matiereIds: [] as string[],
  emailParent: '',
  classeId: '',
};

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<User[]>([]);
  const [filtreRole, setFiltreRole] = useState<Role | 'TOUS'>('TOUS');
  const [recherche, setRecherche] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [edition, setEdition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [roleConnecte, setRoleConnecte] = useState<Role | null>(null);
  const [enfantsSelectionnes, setEnfantsSelectionnes] = useState<string[]>([]);
  const [relations, setRelations] = useState<Record<string, string>>({});

  async function charger() {
    try {
      const [ru, rm, rc, re] = await Promise.all([
        fetch('/api/utilisateurs'),
        fetch('/api/matieres'),
        fetch('/api/classes'),
        fetch('/api/utilisateurs?role=ETUDIANT'),
      ]);

      const dataUsers = await ru.json();
      const dataMatieres = await rm.json();
      const dataClasses = await rc.json();
      const dataEleves = await re.json();

      setUsers(Array.isArray(dataUsers) ? dataUsers : []);
      setMatieres(Array.isArray(dataMatieres) ? dataMatieres : []);
      setClasses(Array.isArray(dataClasses) ? dataClasses : []);
      setEleves(Array.isArray(dataEleves) ? dataEleves : []);
    } catch (e) {
      console.error('Erreur chargement:', e);
      setUsers([]);
      setMatieres([]);
      setClasses([]);
      setEleves([]);
    }
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRoleConnecte(d.role))
      .catch(() => setRoleConnecte(null));
    charger();
  }, []);

  useEffect(() => {
    if (!edition || form.role !== 'PARENT' || !form.id) return;
    fetch('/api/parents')
      .then((r) => r.json())
      .then((parents: any[]) => {
        const parent = parents.find((p) => p.id === form.id);
        if (parent) {
          const ids = parent.enfants.map((e: any) => e.eleve.id);
          setEnfantsSelectionnes(ids);
          const rel: Record<string, string> = {};
          parent.enfants.forEach((e: any) => {
            rel[e.eleve.id] = e.relation || '';
          });
          setRelations(rel);
        }
      });
  }, [edition, form.role, form.id]);

  useEffect(() => {
    if (form.role !== 'PARENT' || !form.email) return;
    const emailLower = form.email.toLowerCase().trim();
    const enfantsAuto = eleves
      .filter((e) => e.emailParent && e.emailParent.toLowerCase().trim() === emailLower)
      .map((e) => e.id);
    if (enfantsAuto.length > 0) {
      setEnfantsSelectionnes(enfantsAuto);
    }
  }, [form.role, form.email, eleves]);

  const filtres = useMemo(() => {
    return users.filter((u) => {
      if (filtreRole !== 'TOUS' && u.role !== filtreRole) return false;
      const q = recherche.toLowerCase().trim();
      if (!q) return true;
      return (
        u.nom.toLowerCase().includes(q) ||
        u.prenom.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, filtreRole, recherche]);

  function toggleMatiere(id: string) {
    setForm((f) => ({
      ...f,
      matiereIds: f.matiereIds.includes(id)
        ? f.matiereIds.filter((m) => m !== id)
        : [...f.matiereIds, id],
    }));
  }

  function toggleEnfant(id: string) {
    setEnfantsSelectionnes((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const url = edition ? '/api/utilisateurs/' + form.id : '/api/utilisateurs';
    const method = edition ? 'PUT' : 'POST';

    const body: any = {
      email: form.email,
      nom: form.nom,
      prenom: form.prenom,
      role: form.role,
    };
    if (form.motDePasse) body.motDePasse = form.motDePasse;
    if (form.role === 'PROFESSEUR') body.matiereIds = form.matiereIds;
    if (form.role === 'ETUDIANT') {
      body.emailParent = form.emailParent || null;
      body.classeId = form.classeId || null;
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      setLoading(false);
      setMessage('❌ ' + (err.erreur ?? 'Erreur'));
      return;
    }

    const userCree = await res.json();

    if (userCree.motDePasseGenere) {
      alert(
        '✅ Utilisateur créé !\n\n' +
          'Email : ' + form.email + '\n' +
          'Mot de passe : ' + userCree.motDePasseGenere + '\n\n' +
          'Communiquez ce mot de passe à l\'utilisateur.'
      );
    }

    if (form.role === 'PARENT') {
      const parents = await (await fetch('/api/parents')).json();
      const parentActuel = parents.find((p: any) => p.id === userCree.id);
      const liensActuels = parentActuel?.enfants?.map((e: any) => e.eleve.id) ?? [];

      for (const lien of parentActuel?.enfants ?? []) {
        if (!enfantsSelectionnes.includes(lien.eleve.id)) {
          await fetch('/api/parents/' + lien.id, { method: 'DELETE' });
        }
      }

      for (const eleveId of enfantsSelectionnes) {
        if (!liensActuels.includes(eleveId)) {
          await fetch('/api/parents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: userCree.id,
              eleveId,
              relation: relations[eleveId] || null,
            }),
          });
        }
      }
    }

    setLoading(false);
    setMessage(edition ? '✅ Utilisateur modifié' : '✅ Utilisateur créé');
    setForm(EMPTY_FORM);
    setEnfantsSelectionnes([]);
    setRelations({});
    setEdition(false);
    charger();
  }

  function editer(u: User) {
    setForm({
      id: u.id,
      email: u.email,
      motDePasse: '',
      nom: u.nom,
      prenom: u.prenom,
      role: u.role,
      matiereIds: u.matieres?.map((m) => m.id) ?? [],
      emailParent: u.emailParent ?? '',
      classeId: u.inscriptions?.[0]?.classe?.id ?? '',
    });
    setEnfantsSelectionnes([]);
    setRelations({});
    setEdition(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function annuler() {
    setForm(EMPTY_FORM);
    setEnfantsSelectionnes([]);
    setRelations({});
    setEdition(false);
    setMessage('');
  }

  async function toggleActif(u: User) {
    await fetch('/api/utilisateurs/' + u.id + '/toggle-actif', { method: 'POST' });
    charger();
  }

  async function supprimer(u: User) {
    if (!confirm('Supprimer ' + u.prenom + ' ' + u.nom + ' ?')) return;
    const res = await fetch('/api/utilisateurs/' + u.id, { method: 'DELETE' });
    const data = await res.json();
    if (data.message) alert(data.message);
    charger();
  }

  const isSuperAdmin = roleConnecte === 'SUPER_ADMIN';
  const isAdmin = roleConnecte === 'ADMIN';
  const peutCreer = isSuperAdmin || isAdmin;
  const emailLower = form.email.toLowerCase().trim();
  const elevesAffiches =
    form.role === 'PARENT' && emailLower
      ? eleves.filter((e) => e.emailParent && e.emailParent.toLowerCase().trim() === emailLower)
      : eleves;
  const enfantsAuto = emailLower ? elevesAffiches.length : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 mt-1">{users.length} compte(s)</p>
        {roleConnecte && (
          <p className="text-xs text-gray-400 mt-1">
            Connecté en tant que : {ROLE_LABEL[roleConnecte]}
          </p>
        )}
      </div>

      {peutCreer && (
        <div
          className={
            'bg-white rounded-xl shadow-sm border-2 p-6 ' +
            (edition ? 'border-blue-400' : 'border-gray-100')
          }
        >
          <h2 className="font-semibold mb-4">
            {edition
              ? '✏️ Modifier ' + form.prenom + ' ' + form.nom
              : '➕ Nouvel utilisateur'}
          </h2>

          <form onSubmit={enregistrer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {edition ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : form.role === 'ETUDIANT' || form.role === 'PARENT' ? 'Mot de passe (laisser vide = prenom-nom)' : 'Mot de passe'}
                </label>
                <input type="password" value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} placeholder={!edition && (form.role === 'ETUDIANT' || form.role === 'PARENT') ? 'Auto : prenom-nom (ex: ahmed-benali)' : edition ? 'Inchangé si vide' : '6 caractères minimum'} required={!edition && form.role !== 'ETUDIANT' && form.role !== 'PARENT'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                {!edition && (form.role === 'ETUDIANT' || form.role === 'PARENT') && (
                  <p className="text-xs text-gray-500 mt-1">💡 Laissez vide pour générer automatiquement <code>prenom-nom</code></p>
                )}
              </div>
              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
  <select
    value={form.role}
    onChange={(e) =>
      setForm({ ...form, role: e.target.value as Role, matiereIds: [], emailParent: '', classeId: '' })
    }
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
  >
    <option value="ETUDIANT">Élève</option>
    <option value="PARENT">Parent</option>
    {isSuperAdmin && (
      <>
        <option value="PROFESSEUR">Professeur</option>
        <option value="ADMIN">Administrateur</option>
        <option value="SUPER_ADMIN">Super Administrateur</option>
      </>
    )}
  </select>
  {isAdmin && (
    <p className="text-xs text-gray-500 mt-1">
      💡 En tant qu'administrateur, vous pouvez créer uniquement des élèves et des parents.
    </p>
  )}
</div>
            </div>

            {form.role === 'ETUDIANT' && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
                <h3 className="text-sm font-semibold text-blue-900">🏫 Classe de l'élève</h3>
                <select value={form.classeId} onChange={(e) => setForm({ ...form, classeId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">— Aucune classe —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.niveau}) — {c.anneeScolaire}</option>
                  ))}
                </select>
              </div>
            )}

            {form.role === 'ETUDIANT' && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h3 className="text-sm font-semibold text-green-900 mb-2">📧 Contact du parent / tuteur</h3>
                <input type="email" value={form.emailParent} onChange={(e) => setForm({ ...form, emailParent: e.target.value })} placeholder="parent@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            )}

            {form.role === 'PROFESSEUR' && isSuperAdmin && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">📚 Matières enseignées ({form.matiereIds.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {matieres.map((m) => {
                    const selected = form.matiereIds.includes(m.id);
                    return (
                      <label key={m.id} className={'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ' + (selected ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-100')}>
                        <input type="checkbox" checked={selected} onChange={() => toggleMatiere(m.id)} />
                        <span className="font-medium">{m.nom}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {form.role === 'PARENT' && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h3 className="text-sm font-semibold text-purple-900 mb-3">👨‍👩‍👧 Enfants ({enfantsSelectionnes.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {elevesAffiches.map((e) => {
                    const selected = enfantsSelectionnes.includes(e.id);
                    return (
                      <div key={e.id} className={'flex items-center gap-3 p-3 rounded-lg ' + (selected ? 'bg-purple-100' : 'bg-white')}>
                        <input type="checkbox" checked={selected} onChange={() => toggleEnfant(e.id)} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{e.prenom} {e.nom}</p>
                          <p className="text-xs text-gray-500">{e.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {loading ? 'Enregistrement...' : edition ? 'Enregistrer' : "Créer l'utilisateur"}
              </button>
              {edition && (
                <button type="button" onClick={annuler} className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300">Annuler</button>
              )}
              {message && <span className="text-sm font-medium">{message}</span>}
            </div>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          ℹ️ En tant qu'administrateur, vous pouvez <strong>créer et éditer des élèves et des parents</strong>.
          La suppression, la création de professeurs ou d'autres admins est réservée aux <strong>Super Administrateurs</strong>.
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par rôle</label>
          <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value as Role | 'TOUS')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="TOUS">Tous les rôles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admins</option>
            <option value="PROFESSEUR">Professeurs</option>
            <option value="ETUDIANT">Élèves</option>
            <option value="PARENT">Parents</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
          <input type="text" placeholder="Nom, prénom ou email..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nom</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Rôle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Classe / Matières</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtres.map((u) => {
              const peutEditer =
                isSuperAdmin || (isAdmin && (u.role === 'ETUDIANT' || u.role === 'PARENT'));
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{u.prenom} {u.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.role === 'PROFESSEUR' && u.matieres && u.matieres.length > 0 ? (
                      <div className="flex flex-wrap gap-1">{u.matieres.map((m) => <span key={m.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{m.nom}</span>)}</div>
                    ) : u.role === 'ETUDIANT' && u.inscriptions && u.inscriptions.length > 0 ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🏫 {u.inscriptions[0].classe.nom}</span>
                    ) : u.role === 'PARENT' && u.enfants && u.enfants.length > 0 ? (
                      <div className="flex flex-wrap gap-1">{u.enfants.map((lien) => <span key={lien.id} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{lien.eleve.prenom} {lien.eleve.nom}</span>)}</div>
                    ) : (<span className="text-gray-300">—</span>)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (u.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>{u.actif ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2 flex-wrap">
                      {peutEditer && (
                        <button onClick={() => editer(u)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Éditer</button>
                      )}
                      <button onClick={() => toggleActif(u)} className="px-2 py-1 text-xs bg-gray-200 text-gray-900 rounded hover:bg-gray-300">
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => supprimer(u)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Suppr.</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}