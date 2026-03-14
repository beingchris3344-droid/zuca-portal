const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.jumuia.upsert({
    where: { name: "ST. PEREGRINE" },
    update: {},
    create: { 
      name: "ST. PEREGRINE",
      code: "stperegrine" 
    }
  });

  await prisma.jumuia.upsert({
    where: { name: "ST. BENEDICT" },
    update: {},
    create: { 
      name: "ST. BENEDICT",
      code: "stbenedict" 
    }
  });

  await prisma.jumuia.upsert({
    where: { name: "CHRIST THE KING" },
    update: {},
    create: { 
      name: "CHRIST THE KING",
      code: "christtheking" 
    }
  });

  await prisma.jumuia.upsert({
    where: { name: "ST. MICHAEL" },
    update: {},
    create: { 
      name: "ST. MICHAEL",
      code: "stmichael" 
    }
  });

  await prisma.jumuia.upsert({
    where: { name: "ST. GREGORY" },
    update: {},
    create: { 
      name: "ST. GREGORY",
      code: "stgregory" 
    }
  });

  await prisma.jumuia.upsert({
    where: { name: "ST. PACIFICUS" },
    update: {},
    create: { 
      name: "ST. PACIFICUS",
      code: "stpacificus" 
    }
  });

  console.log("Jumuia seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });