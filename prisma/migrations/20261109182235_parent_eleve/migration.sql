/*
  Warnings:

  - You are about to drop the column `emailParent` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailParent";

-- CreateTable
CREATE TABLE "ParentEleve" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "relation" TEXT,

    CONSTRAINT "ParentEleve_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentEleve_parentId_eleveId_key" ON "ParentEleve"("parentId", "eleveId");

-- AddForeignKey
ALTER TABLE "ParentEleve" ADD CONSTRAINT "ParentEleve_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentEleve" ADD CONSTRAINT "ParentEleve_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
