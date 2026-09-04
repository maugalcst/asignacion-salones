import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    // Create SUPER_ADMIN user (no need to delete existing users)
    const superAdminPassword = "superadmin123";
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);

    // Check if superadmin already exists
    const existing = await prisma.user.findUnique({
      where: { username: "superadmin" }
    });

    let superAdmin;
    if (existing) {
      console.log("SuperAdmin already exists, skipping creation");
      superAdmin = existing;
    } else {
      superAdmin = await prisma.user.create({
        data: {
          name: "Sistema Master",
          username: "superadmin",
          email: "superadmin@uanl.edu.mx",
          passwordHash,
          role: "SUPER_ADMIN",
          active: true,
          careerId: null,
        }
      });
      console.log("\n✅ Master SUPER_ADMIN account created successfully!");
    }

    console.log("\n📋 Credentials:");
    console.log(`   Usuario: superadmin`);
    console.log(`   Correo: superadmin@uanl.edu.mx`);
    console.log(`   Contraseña: ${superAdminPassword}`);
    console.log("\n⚠️  Save these credentials carefully!");

    const verify = await prisma.user.findUnique({
      where: { id: superAdmin.id }
    });
    console.log(`\n✅ Verification: User found - ID: ${verify.id}, Role: ${verify.role}`);

  } catch (error) {
    console.error("Error creating SUPER_ADMIN:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
