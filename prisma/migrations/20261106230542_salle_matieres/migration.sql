-- AlterTable
ALTER TABLE "Cours" ADD COLUMN     "salleId" TEXT;

-- CreateTable
CREATE TABLE "Salle" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER,
    "type" TEXT,
    "batiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SalleMatieres" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SalleMatieres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salle_nom_key" ON "Salle"("nom");

-- CreateIndex
CREATE INDEX "_SalleMatieres_B_index" ON "_SalleMatieres"("B");

-- AddForeignKey
ALTER TABLE "Cours" ADD CONSTRAINT "Cours_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SalleMatieres" ADD CONSTRAINT "_SalleMatieres_A_fkey" FOREIGN KEY ("A") REFERENCES "Matiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SalleMatieres" ADD CONSTRAINT "_SalleMatieres_B_fkey" FOREIGN KEY ("B") REFERENCES "Salle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
