const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const jumuias = [
    "ST. PEREGRINE",
    "ST. BENEDICT",
    "CHRIST THE KING",
    "ST. MICHAEL",
    "ST. GREGORY",
    "ST. PACIFICUS"
  ];

  for (const name of jumuias) {
    await prisma.jumuiya.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Jumuiya seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });