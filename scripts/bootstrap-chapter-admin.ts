import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const email = "rc@slccneca.org".trim().toLowerCase();
  const firstName = "Ryan-SLCC";
  const lastName = "Courtney";
  const name = "Ryan-SLCC Courtney";
  const plainPassword = "*******";
  const chapterName = "Southeastern Line Constructors Chapter NECA";

  if (!email) throw new Error("Missing email.");
  if (!plainPassword) throw new Error("Missing password.");
  if (!chapterName) throw new Error("Missing chapter name.");

  const chapter = await prisma.chapter.findFirst({
    where: {
      name: chapterName,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!chapter) {
    throw new Error(`Chapter not found: ${chapterName}`);
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      firstName,
      lastName,
      globalRole: "STANDARD",
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
      globalRole: "STANDARD",
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

  await prisma.chapterMembership.upsert({
    where: {
      userId_chapterId: {
        userId: user.id,
        chapterId: chapter.id,
      },
    },
    update: {
      role: "CHAPTER_ADMIN",
      isActive: true,
    },
    create: {
      userId: user.id,
      chapterId: chapter.id,
      role: "CHAPTER_ADMIN",
      isActive: true,
    },
  });

  console.log("Bootstrap chapter admin ready:");
  console.log({
    user,
    chapter,
    membershipRole: "CHAPTER_ADMIN",
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to bootstrap chapter admin:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });