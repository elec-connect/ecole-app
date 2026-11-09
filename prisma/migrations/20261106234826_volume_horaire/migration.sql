-- AlterTable
ALTER TABLE "Matiere" ADD COLUMN     "heuresParSemaine" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "VolumeHoraire" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "heures" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "VolumeHoraire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VolumeHoraire_classeId_matiereId_key" ON "VolumeHoraire"("classeId", "matiereId");

-- AddForeignKey
ALTER TABLE "VolumeHoraire" ADD CONSTRAINT "VolumeHoraire_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolumeHoraire" ADD CONSTRAINT "VolumeHoraire_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;
