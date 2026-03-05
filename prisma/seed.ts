import { prisma } from "@/lib/prisma";

async function main() {
  // Create a default system user (avoids ownerUserId problems later)
  await prisma.user.upsert({
    where: { id: "system" },
    update: {},
    create: {
      id: "system",
      email: "system@local",
      name: "System",
    },
  });

  // Central Intelligence system KB
  await prisma.knowledgeBase.upsert({
    where: { id: "central" },
    update: {},
    create: {
      id: "central",
      name: "Central Intelligence",
      visibility: "SYSTEM",
      vectorStoreId: process.env.OPENAI_VS_CENTRAL ?? "",
      ownerUserId: "system",
    },
  });

  // CBAs Shared system KB
  await prisma.knowledgeBase.upsert({
    where: { id: "cbas_shared" },
    update: {},
    create: {
      id: "cbas_shared",
      name: "CBAs Shared",
      visibility: "SYSTEM",
      vectorStoreId: process.env.OPENAI_VS_CBAS_SHARED ?? "",
      ownerUserId: "system",
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });