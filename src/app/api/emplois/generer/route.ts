import { NextResponse } from 'next/server';
import { getPrismaDynamic } from '@/lib/prisma-dynamic';
import { withAdmin } from '@/lib/api-helpers';

// Grille horaire par jour
const CRENEAUX_PAR_JOUR: Record<number, { debut: string; fin: string }[]> = {
  // Lundi-Jeudi : 8h-12h + 14h-18h
  1: [
    { debut: '08:00', fin: '09:00' }, { debut: '09:00', fin: '10:00' },
    { debut: '10:00', fin: '11:00' }, { debut: '11:00', fin: '12:00' },
    { debut: '14:00', fin: '15:00' }, { debut: '15:00', fin: '16:00' },
    { debut: '16:00', fin: '17:00' }, { debut: '17:00', fin: '18:00' },
  ],
  2: [
    { debut: '08:00', fin: '09:00' }, { debut: '09:00', fin: '10:00' },
    { debut: '10:00', fin: '11:00' }, { debut: '11:00', fin: '12:00' },
    { debut: '14:00', fin: '15:00' }, { debut: '15:00', fin: '16:00' },
    { debut: '16:00', fin: '17:00' }, { debut: '17:00', fin: '18:00' },
  ],
  3: [
    { debut: '08:00', fin: '09:00' }, { debut: '09:00', fin: '10:00' },
    { debut: '10:00', fin: '11:00' }, { debut: '11:00', fin: '12:00' },
    { debut: '14:00', fin: '15:00' }, { debut: '15:00', fin: '16:00' },
    { debut: '16:00', fin: '17:00' }, { debut: '17:00', fin: '18:00' },
  ],
  4: [
    { debut: '08:00', fin: '09:00' }, { debut: '09:00', fin: '10:00' },
    { debut: '10:00', fin: '11:00' }, { debut: '11:00', fin: '12:00' },
    { debut: '14:00', fin: '15:00' }, { debut: '15:00', fin: '16:00' },
    { debut: '16:00', fin: '17:00' }, { debut: '17:00', fin: '18:00' },
  ],
  // Vendredi-Samedi : 8h-13h
  5: [
    { debut: '08:00', fin: '09:00' }, { debut: '09:00', fin: '10:00' },
    { debut: '10:00', fin: '11:00' }, { debut: '11:00', fin: '12:00' },
    { debut: '12:00', fin: '13:00' },
  ],
  6: [
    { debut: '08:00', fin: '09:00' }, { debut: '09:00', fin: '10:00' },
    { debut: '10:00', fin: '11:00' }, { debut: '11:00', fin: '12:00' },
    { debut: '12:00', fin: '13:00' },
  ],
};

const JOURS = [1, 2, 3, 4, 5, 6];

type CoursPlace = {
  classeId: string;
  matiereId: string;
  professeurId: string;
  salleId: string | null;
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
};

function key(...parts: (string | number)[]): string {
  return parts.join('|');
}

export const POST = withAdmin(async (req) => {
  try {
    const body = await req.json();
    const { classeIds, remplacerExistant } = body;
    console.log('[GENERER] Début, classeIds:', classeIds);

    if (!Array.isArray(classeIds) || classeIds.length === 0) {
      return NextResponse.json({ erreur: 'classeIds requis', nbGeneres: 0, erreurs: [] }, { status: 400 });
    }

    const db = await getPrismaDynamic();

    const classes = await db.classe.findMany({ where: { id: { in: classeIds } } });
    const volumes = await db.volumeHoraire.findMany({ where: { classeId: { in: classeIds } } });
    const matieres = await db.matiere.findMany();
    const profs = await db.user.findMany({
      where: { role: 'PROFESSEUR', actif: true },
      include: { matieres: { select: { id: true } } },
    });
    const salles = await db.salle.findMany({
      include: { matieres: { select: { id: true } } },
    });

    console.log('[GENERER] Classes:', classes.length, '| Volumes:', volumes.length,
      '| Matières:', matieres.length, '| Profs:', profs.length, '| Salles:', salles.length);

    if (remplacerExistant) {
      const del = await db.cours.deleteMany({ where: { classeId: { in: classeIds } } });
      console.log('[GENERER] Cours supprimés:', del.count);
    }

    const coursExistants = await db.cours.findMany({ where: { classeId: { notIn: classeIds } } });
    const occupeProf = new Set<string>();
    const occupeSalle = new Set<string>();
    const occupeClasse = new Set<string>();

    for (const c of coursExistants) {
      occupeProf.add(key(c.professeurId, c.jourSemaine, c.heureDebut));
      occupeClasse.add(key(c.classeId, c.jourSemaine, c.heureDebut));
      if (c.salleId) occupeSalle.add(key(c.salleId, c.jourSemaine, c.heureDebut));
    }

    const coursGeneres: CoursPlace[] = [];
    const erreurs: string[] = [];

    for (const classe of classes) {
      const volsClasse = volumes.filter((v) => v.classeId === classe.id);
      if (volsClasse.length === 0) {
        erreurs.push(classe.nom + ': aucun volume horaire');
        continue;
      }

      const aPlacer: string[] = [];
      for (const vol of volsClasse) {
        for (let i = 0; i < vol.heures; i++) {
          aPlacer.push(vol.matiereId);
        }
      }
      aPlacer.sort(() => Math.random() - 0.5);
      console.log('[GENERER] Classe', classe.nom, '- cours à placer:', aPlacer.length);

      // Compteur de cours déjà placés par jour pour équilibrer
      const coursParJour: Record<number, number> = {};
      JOURS.forEach((j) => (coursParJour[j] = 0));
      for (const c of coursGeneres.filter((x) => x.classeId === classe.id)) {
        coursParJour[c.jourSemaine] = (coursParJour[c.jourSemaine] || 0) + 1;
      }

      for (const matiereId of aPlacer) {
        const matiere = matieres.find((m) => m.id === matiereId);
        if (!matiere) continue;

        const profsPossibles = profs.filter((p) =>
          p.matieres && p.matieres.some((m) => m.id === matiereId)
        );
        if (profsPossibles.length === 0) {
          erreurs.push(classe.nom + ' / ' + matiere.nom + ': aucun prof');
          continue;
        }

        const sallesSpecialisees = salles.filter((s) =>
          s.matieres.some((m) => m.id === matiereId)
        );
        const sallesPolyvalentes = salles.filter((s) => s.matieres.length === 0);

        let place = false;

        // Trier les jours par nombre de cours croissant (équilibrage)
        const joursTries = [...JOURS].sort((a, b) => coursParJour[a] - coursParJour[b]);

        for (const jour of joursTries) {
          const creneaux = CRENEAUX_PAR_JOUR[jour] || [];
          for (const creneau of creneaux) {
            if (occupeClasse.has(key(classe.id, jour, creneau.debut))) continue;

            const profDispo = profsPossibles.find(
              (p) => !occupeProf.has(key(p.id, jour, creneau.debut))
            );
            if (!profDispo) continue;

            let salleDispo = sallesSpecialisees.find(
              (s) => !occupeSalle.has(key(s.id, jour, creneau.debut))
            );
            if (!salleDispo) {
              salleDispo = sallesPolyvalentes.find(
                (s) => !occupeSalle.has(key(s.id, jour, creneau.debut))
              );
            }
            const salleId = salleDispo?.id ?? null;

            coursGeneres.push({
              classeId: classe.id,
              matiereId,
              professeurId: profDispo.id,
              salleId,
              jourSemaine: jour,
              heureDebut: creneau.debut,
              heureFin: creneau.fin,
            });

            occupeClasse.add(key(classe.id, jour, creneau.debut));
            occupeProf.add(key(profDispo.id, jour, creneau.debut));
            if (salleId) occupeSalle.add(key(salleId, jour, creneau.debut));
            coursParJour[jour] = (coursParJour[jour] || 0) + 1;

            place = true;
            break;
          }
          if (place) break;
        }

        if (!place) {
          erreurs.push(classe.nom + ' / ' + matiere.nom + ': pas de créneau');
        }
      }
    }

    console.log('[GENERER] Total cours à insérer:', coursGeneres.length);

    if (coursGeneres.length > 0) {
      await db.cours.createMany({ data: coursGeneres });
      console.log('[GENERER] ✅ Cours insérés');
    }

    return NextResponse.json({ ok: true, nbGeneres: coursGeneres.length, erreurs });
  } catch (e: any) {
    console.error('[GENERER] ERREUR:', e);
    return NextResponse.json(
      { erreur: e?.message ?? 'Erreur inconnue', nbGeneres: 0, erreurs: [String(e)] },
      { status: 500 }
    );
  }
});