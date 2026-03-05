import { promises as fs } from "fs";
import path from "path";

const KB_INDEX_PATH = path.join(process.cwd(), "data", "kb-index.json");

export type KBIndex = {
  central: { id: "central"; name: string; vectorStoreId: string };
  userKbs: { id: string; name: string; vectorStoreId: string; createdAt?: string }[];
};

export async function readKBIndex(): Promise<KBIndex> {
  const raw = await fs.readFile(KB_INDEX_PATH, "utf8");
  return JSON.parse(raw);
}

export async function resolveVectorStoreId(kbId?: string): Promise<string> {
  const index = await readKBIndex();

  if (!kbId || kbId === "central") return index.central.vectorStoreId;

  const match = index.userKbs.find((k) => k.id === kbId);
  if (!match) throw new Error(`Unknown kbId: ${kbId}`);

  return match.vectorStoreId;
}