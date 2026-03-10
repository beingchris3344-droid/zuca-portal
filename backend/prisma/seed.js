// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin.zuca", 10);

  // Update admin to use lowercase 'admin' role
  await prisma.user.update({
    where: { email: "admin@zuca.com" },
    data: {
      password: hashedPassword,
      role: "admin", // lowercase to match your codebase
      fullName: "ZUCA ADMIN"
    }
  });

  console.log("✅ Admin updated with lowercase 'admin' role");
  console.log("\n📝 Login credentials:");
  console.log("Admin - email: admin@zuca.com, password: admin.zuca");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());