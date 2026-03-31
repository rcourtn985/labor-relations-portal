import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const email = "rcourtn@gmail.com".trim().toLowerCase();
  const firstName = "Ryan";
  const lastName = "Courtney";
  const name = "Ryan Courtney";
  const plainPassword = "D*********";

  if (!email) {
    throw new Error("Missing email.");
  }

  if (!plainPassword) {
    throw new Error("Missing password.");
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      firstName,
      lastName,
      globalRole: "SYSTEM_ADMIN",
      accountStatus: "ACTIVE",
      passwordHash,
      passwordSetAt: new Date(),
      deletedAt: null,
    },
    create: {
      email,
      name,
      firstName,
      lastName,
      globalRole: "SYSTEM_ADMIN",
      accountStatus: "ACTIVE",
      passwordHash,
      passwordSetAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      accountStatus: true,
    },
  });

  console.log("Bootstrap system admin ready:");
  console.log(user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to bootstrap system admin:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });