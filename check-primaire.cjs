const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const classes = await db.classe.findMany({
    where: {
      niveau: {
        in: [
          "1ere_primaire",
          "2eme_primaire",
          "3eme_primaire",
          "4eme_primaire",
          "5eme_primaire",
          "6eme_primaire"
        ]
      }
    },
    select: {
      nom: true,
      niveau: true,
      anneeScolaire: true
    },
    orderBy: [{ niveau: "asc" }, { nom: "asc" }]
  });

  console.table(classes);
  await db.$disconnect();
}

main().catch(console.error);
