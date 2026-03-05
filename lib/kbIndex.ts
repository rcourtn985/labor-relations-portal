import { prisma } from "@/lib/prisma";

export type KBIndex = {
  central: { id: "central"; name: string; vectorStoreId: string };
  userKbs: { id: string; name: string; vectorStoreId: string; createdAt?: string }[];
};

export async function readKBIndex(): Promise<KBIndex> {
  const [central, userKbs] = await Promise.all([
    prisma.knowledgeBase.findUnique({ where: { id: "central" } }),
    prisma.knowledgeBase.findMany({
      where: { visibility: { not: "SYSTEM" } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!central) throw new Error("System KB missing: central (run: npx prisma db seed)");

  return {
    central: {
      id: "central",
      name: central.name,
      vectorStoreId: central.vectorStoreId,
    },
    userKbs: userKbs.map((k) => ({
      id: k.id,
      name: k.name,
      vectorStoreId: k.vectorStoreId,
      createdAt: k.createdAt.toISOString(),
    })),
  };
}

export async function resolveVectorStoreId(kbId?: string): Promise<string> {
  const id = !kbId || kbId === "central" ? "central" : kbId;

  const kb = await prisma.knowledgeBase.findUnique({ where: { id } });
  if (!kb) throw new Error(`Unknown kbId: ${id}`);

  // This helps you catch "seed ran but no vector store id set yet"
  if (!kb.vectorStoreId) throw new Error(`KB ${id} has no vectorStoreId set yet`);

  return kb.vectorStoreId;
}