/*
  Warnings:

  - A unique constraint covering the columns `[etudiantId,evaluationId]` on the table `Note` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "evaluationId" TEXT;

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "coursId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeNote" NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_coursId_nom_key" ON "Evaluation"("coursId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Note_etudiantId_evaluationId_key" ON "Note"("etudiantId", "evaluationId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
