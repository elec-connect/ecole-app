-- CreateEnum
CREATE TYPE "StatutSeance" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'REJETEE');

-- CreateTable
CREATE TABLE "SeanceTravail" (
    "id" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,
    "coursId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heuresDeclarees" DOUBLE PRECISION NOT NULL,
    "heuresValidees" DOUBLE PRECISION,
    "description" TEXT,
    "statut" "StatutSeance" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRejet" TEXT,
    "declareLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),
    "traiteParId" TEXT,

    CONSTRAINT "SeanceTravail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeanceTravail_professeurId_date_idx" ON "SeanceTravail"("professeurId", "date");

-- CreateIndex
CREATE INDEX "SeanceTravail_statut_idx" ON "SeanceTravail"("statut");

-- AddForeignKey
ALTER TABLE "SeanceTravail" ADD CONSTRAINT "SeanceTravail_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeanceTravail" ADD CONSTRAINT "SeanceTravail_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeanceTravail" ADD CONSTRAINT "SeanceTravail_traiteParId_fkey" FOREIGN KEY ("traiteParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
