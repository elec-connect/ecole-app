/*
  Warnings:

  - You are about to drop the column `classeDemandee` on the `DemandeInscription` table. All the data in the column will be lost.
  - Added the required column `niveauDemande` to the `DemandeInscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DemandeInscription" DROP COLUMN "classeDemandee",
ADD COLUMN     "niveauDemande" TEXT NOT NULL;
