const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const email = "admin2@zuca.com";      
  const password = "Admin.zuca";         
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if an admin already exists with this email
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log("Admin already exists. Skipping creation.");
    return;
  }

  // Create new admin user
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      fullName: "Super Admin",          // required
      createdAt: new Date(),            // only use createdAt
      // other optional fields can be added if needed
    },
  });

  console.log("New admin created:", admin.email);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());