import "dotenv/config";
import Database from "better-sqlite3";
import path from "path";
import { prisma } from "@/lib/prisma";

const SQLITE_PATH = path.resolve(process.cwd(), "prisma/dev.db");

type SqliteUser = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
};

type SqliteKB = {
  id: string;
  name: string;
  vectorStoreId: string;
  visibility: string;
  ownerUserId: string | null;
  createdAt: string;
};

type SqliteDocument = {
  id: string;
  ownerUserId: string;
  kbId: string;
  openaiFileId: string;
  filename: string | null;
  createdAt: string;
  isCba: number;
  chapter: string | null;
  cbaType: string | null;
  state: string | null;
  localUnion: string | null;
  employer: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sharedToCbas: number;
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  sha256: string | null;
};

type SqliteDocumentText = {
  id: string;
  documentId: string;
  extractedText: string;
  extractionState: string;
  extractedAt: string;
};

function normalizeEmail(user: SqliteUser): string {
  const trimmed = user.email?.trim().toLowerCase();
  if (trimmed) return trimmed;

  return `migrated-${user.id}@placeholder.local`;
}

async function main() {
  console.log(`Opening SQLite at: ${SQLITE_PATH}`);
  const db = new Database(SQLITE_PATH, { readonly: true });

  const users = db.prepare("SELECT * FROM User").all() as SqliteUser[];
  const kbs = db.prepare("SELECT * FROM KnowledgeBase").all() as SqliteKB[];
  const documents = db.prepare("SELECT * FROM Document").all() as SqliteDocument[];
  const documentTexts = db.prepare("SELECT * FROM DocumentText").all() as SqliteDocumentText[];

  db.close();

  console.log(
    `Read from SQLite — users: ${users.length}, KBs: ${kbs.length}, documents: ${documents.length}, text records: ${documentTexts.length}`
  );

  console.log("\nMigrating users...");
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: normalizeEmail(u),
        name: u.name ?? undefined,
        createdAt: new Date(u.createdAt),
      },
    });
    console.log(`  ✓ user ${u.id}`);
  }

  console.log("\nMigrating knowledge bases...");
  for (const k of kbs) {
    await prisma.knowledgeBase.upsert({
      where: { id: k.id },
      update: {},
      create: {
        id: k.id,
        name: k.name,
        vectorStoreId: k.vectorStoreId,
        visibility: k.visibility as "PRIVATE" | "SHARED" | "SYSTEM",
        ownerUserId: k.ownerUserId ?? undefined,
        createdAt: new Date(k.createdAt),
      },
    });
    console.log(`  ✓ KB "${k.name}" (${k.id})`);
  }

  console.log("\nMigrating documents...");
  for (const d of documents) {
    await prisma.document.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        ownerUserId: d.ownerUserId,
        kbId: d.kbId,
        openaiFileId: d.openaiFileId,
        filename: d.filename ?? "",
        createdAt: new Date(d.createdAt),
        isCba: Boolean(d.isCba),
        chapter: d.chapter ?? null,
        cbaType: d.cbaType ?? null,
        state: d.state ?? null,
        localUnion: d.localUnion ?? null,
        employer: d.employer ?? null,
        effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : null,
        effectiveTo: d.effectiveTo ? new Date(d.effectiveTo) : null,
        sharedToCbas: Boolean(d.sharedToCbas),
        storageProvider: d.storageProvider ?? null,
        storageKey: d.storageKey ?? null,
        mimeType: d.mimeType ?? null,
        fileSizeBytes: d.fileSizeBytes ?? null,
        sha256: d.sha256 ?? null,
      },
    });
    console.log(`  ✓ document "${d.filename}" (${d.id})`);
  }

  console.log("\nMigrating extracted text records...");
  for (const t of documentTexts) {
    await prisma.documentText.upsert({
      where: { documentId: t.documentId },
      update: {},
      create: {
        id: t.id,
        documentId: t.documentId,
        extractedText: t.extractedText,
        extractionState: t.extractionState,
        extractedAt: new Date(t.extractedAt),
      },
    });
    console.log(`  ✓ text for document ${t.documentId}`);
  }

  console.log("\nMigration complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("\nMigration failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });