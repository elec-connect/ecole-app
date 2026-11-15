-- CreateTable
CREATE TABLE "TarifProfesseur" (
    "id" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "tauxHoraire" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifProfesseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaieProfesseur" (
    "id" TEXT NOT NULL,
    "tarifId" TEXT NOT NULL,
    "mois" "MoisScolaire" NOT NULL,
    "heuresTravaillees" DOUBLE PRECISION NOT NULL,
    "tauxHoraire" DOUBLE PRECISION NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methode" TEXT,
    "reference" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'PAYE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaieProfesseur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TarifProfesseur_professeurId_anneeScolaire_key" ON "TarifProfesseur"("professeurId", "anneeScolaire");

-- CreateIndex
CREATE UNIQUE INDEX "PaieProfesseur_tarifId_mois_key" ON "PaieProfesseur"("tarifId", "mois");

-- AddForeignKey
ALTER TABLE "TarifProfesseur" ADD CONSTRAINT "TarifProfesseur_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaieProfesseur" ADD CONSTRAINT "PaieProfesseur_tarifId_fkey" FOREIGN KEY ("tarifId") REFERENCES "TarifProfesseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
