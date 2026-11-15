-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('PAYE', 'IMPAYE', 'PARTIEL');

-- CreateEnum
CREATE TYPE "MoisScolaire" AS ENUM ('SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE', 'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT');

-- CreateTable
CREATE TABLE "FraisScolarite" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "montantMensuel" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraisScolarite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "fraisId" TEXT NOT NULL,
    "mois" "MoisScolaire" NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methode" TEXT,
    "reference" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'PAYE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FraisScolarite_eleveId_anneeScolaire_key" ON "FraisScolarite"("eleveId", "anneeScolaire");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_fraisId_mois_key" ON "Paiement"("fraisId", "mois");

-- AddForeignKey
ALTER TABLE "FraisScolarite" ADD CONSTRAINT "FraisScolarite_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_fraisId_fkey" FOREIGN KEY ("fraisId") REFERENCES "FraisScolarite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
