import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";
import { promises as fs } from "fs";
import fssync from "fs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KB_UPLOADS_DIR = path.join(process.cwd(), "kb_user_uploads");

// For now (no auth yet), we attach created KBs + docs to the seeded "system" user.
const DEFAULT_OWNER_USER_ID = "system";

function safeId() {
  return `kb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
    }

    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing 'name' (string)." }, { status: 400 });
    }

    const folderPath = path.join(KB_UPLOADS_DIR, name);

    // Confirm folder exists
    const stat = await fs.stat(folderPath).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json(
        { error: `Folder not found: kb_user_uploads/${name}` },
        { status: 400 }
      );
    }

    // Collect files (full paths)
    const entries = await fs.readdir(folderPath);
    const filePaths = entries
      .filter((f) => !f.startsWith("."))
      .map((f) => path.join(folderPath, f))
      .filter((p) => fssync.existsSync(p) && fssync.statSync(p).isFile());

    if (filePaths.length === 0) {
      return NextResponse.json({ error: "No files found in that folder." }, { status: 400 });
    }

    // Find or create the KB
    let kb = await prisma.knowledgeBase.findFirst({
      where: { ownerUserId: DEFAULT_OWNER_USER_ID, name },
    });

    let createdNewKb = false;

    if (!kb) {
      // Create vector store
      const vs = await openai.vectorStores.create({ name: `User KB: ${name}` });

      const id = safeId();

      kb = await prisma.knowledgeBase.create({
        data: {
          id,
          name,
          vectorStoreId: vs.id,
          visibility: "PRIVATE",
          ownerUserId: DEFAULT_OWNER_USER_ID,
        },
      });

      createdNewKb = true;
    }

    if (!kb.vectorStoreId || !kb.vectorStoreId.startsWith("vs_")) {
      return NextResponse.json(
        { error: `KB ${kb.id} has no valid vectorStoreId (expected vs_...)` },
        { status: 400 }
      );
    }

    // Load existing docs for this KB to avoid duplicates
    const existingDocs = await prisma.document.findMany({
      where: { kbId: kb.id },
      select: { filename: true },
    });

    const existingFilenames = new Set(existingDocs.map((d) => d.filename.trim()));

    // Determine which files are missing (by filename)
    const missing = filePaths
      .map((p) => ({ fullPath: p, filename: path.basename(p) }))
      .filter((f) => !existingFilenames.has(f.filename));

    if (missing.length === 0) {
      return NextResponse.json({
        id: kb.id,
        name: kb.name,
        vectorStoreId: kb.vectorStoreId,
        createdNewKb,
        addedCount: 0,
        message: "No new files to add (already up to date).",
      });
    }

    // Upload + attach only missing files
    const createdDocs: { openaiFileId: string; filename: string }[] = [];

    for (const f of missing) {
      const uploaded = await openai.files.create({
        file: fssync.createReadStream(f.fullPath),
        purpose: "assistants",
      });

      await openai.vectorStores.files.create(kb.vectorStoreId, { file_id: uploaded.id });

      createdDocs.push({
        openaiFileId: uploaded.id,
        filename: f.filename,
      });
    }

    // Wait for indexing
    while (true) {
      const current = await openai.vectorStores.retrieve(kb.vectorStoreId);
      const inProgress = current.file_counts?.in_progress ?? 0;
      if (current.status === "completed" && inProgress === 0) break;
      await sleep(1500);
    }

    // Write new Document rows (idempotent-safe)
    for (const d of createdDocs) {
      try {
        await prisma.document.create({
          data: {
            ownerUserId: DEFAULT_OWNER_USER_ID,
            kbId: kb.id,
            openaiFileId: d.openaiFileId,
            filename: d.filename,
          },
        });
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code?: string }).code === "P2002"
        ) {
          continue;
        }
        throw e;
      }
    }

    return NextResponse.json({
      id: kb.id,
      name: kb.name,
      vectorStoreId: kb.vectorStoreId,
      createdNewKb,
      addedCount: createdDocs.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}