-- CreateTable
CREATE TABLE "_ProfMatieres" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfMatieres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProfMatieres_B_index" ON "_ProfMatieres"("B");

-- AddForeignKey
ALTER TABLE "_ProfMatieres" ADD CONSTRAINT "_ProfMatieres_A_fkey" FOREIGN KEY ("A") REFERENCES "Matiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfMatieres" ADD CONSTRAINT "_ProfMatieres_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
