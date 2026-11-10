-- CreateTable
CREATE TABLE "Archive" (
    "id" TEXT NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "nbEleves" INTEGER NOT NULL DEFAULT 0,
    "nbNotes" INTEGER NOT NULL DEFAULT 0,
    "nbClasses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("id")
);
