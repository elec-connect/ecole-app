const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const classes = await db.classe.findMany({
    orderBy: [{ niveau: "asc" }, { nom: "asc" }],
    select: {
      id: true,
      nom: true,
      niveau: true,
      anneeScolaire: true
    }
  });

  console.table(classes);
  await db.$disconnect();
}

main().catch(console.error);
