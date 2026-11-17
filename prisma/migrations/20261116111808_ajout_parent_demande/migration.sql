/*
  Warnings:

  - Added the required column `emailEleve` to the `DemandeInscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomParent` to the `DemandeInscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prenomParent` to the `DemandeInscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DemandeInscription" ADD COLUMN     "emailEleve" TEXT NOT NULL,
ADD COLUMN     "nomParent" TEXT NOT NULL,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "prenomParent" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "DemandeInscription" ADD CONSTRAINT "DemandeInscription_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
