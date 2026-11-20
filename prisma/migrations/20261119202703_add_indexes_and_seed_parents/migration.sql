-- CreateIndex
CREATE INDEX "Cours_classeId_jourSemaine_heureDebut_idx" ON "Cours"("classeId", "jourSemaine", "heureDebut");

-- CreateIndex
CREATE INDEX "Cours_professeurId_jourSemaine_idx" ON "Cours"("professeurId", "jourSemaine");

-- CreateIndex
CREATE INDEX "Inscription_classeId_anneeScolaire_idx" ON "Inscription"("classeId", "anneeScolaire");

-- CreateIndex
CREATE INDEX "Inscription_etudiantId_anneeScolaire_idx" ON "Inscription"("etudiantId", "anneeScolaire");

-- CreateIndex
CREATE INDEX "Message_destinataireId_lu_createdAt_idx" ON "Message"("destinataireId", "lu", "createdAt");

-- CreateIndex
CREATE INDEX "Message_expediteurId_createdAt_idx" ON "Message"("expediteurId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_etudiantId_matiereId_idx" ON "Note"("etudiantId", "matiereId");

-- CreateIndex
CREATE INDEX "Note_matiereId_date_idx" ON "Note"("matiereId", "date");

-- CreateIndex
CREATE INDEX "Presence_etudiantId_date_idx" ON "Presence"("etudiantId", "date");

-- CreateIndex
CREATE INDEX "Presence_coursId_date_idx" ON "Presence"("coursId", "date");

-- CreateIndex
CREATE INDEX "User_role_actif_idx" ON "User"("role", "actif");
