import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";
import { promises as fs } from "fs";
import fssync from "fs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_FOLDERS: Record<string, string> = {
  // system KB id -> folder on disk
  cbas_shared: path.join(process.cwd(), "kb_cbas_shared"),
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getVectorStoreAttachedFilenames(vectorStoreId: string): Promise<Set<string>> {
  const names = new Set<string>();

  // MVP: single page limit=100
  const list = await openai.vectorStores.files.list(vectorStoreId, { limit: 100 });
  const items = list.data ?? [];

  for (const it of items) {
    const fileId = (it as any)?.id;
    if (!fileId) continue;

    try {
      const f = await openai.files.retrieve(fileId);
      const filename = ((f as any)?.filename ?? (f as any)?.name ?? "").trim();
      if (filename) names.add(filename);
    } catch {
      // best effort; ignore if a file can't be retrieved
    }
  }

  return names;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
    }

    const { kbId } = await req.json();

    if (!kbId || typeof kbId !== "string") {
      return NextResponse.json({ error: "Missing 'kbId' (string)." }, { status: 400 });
    }

    const folderPath = SYSTEM_FOLDERS[kbId];
    if (!folderPath) {
      return NextResponse.json(
        { error: `Unknown/unsupported system kbId: ${kbId}` },
        { status: 400 }
      );
    }

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } });
    if (!kb) return NextResponse.json({ error: `KB not found: ${kbId}` }, { status: 404 });
    if (kb.visibility !== "SYSTEM") {
      return NextResponse.json({ error: `KB ${kbId} is not SYSTEM` }, { status: 400 });
    }

    // Ensure vector store exists (create if missing)
    let vectorStoreId = kb.vectorStoreId;
    if (!vectorStoreId || !vectorStoreId.startsWith("vs_")) {
      const vs = await openai.vectorStores.create({ name: `System KB: ${kb.name}` });
      vectorStoreId = vs.id;
      await prisma.knowledgeBase.update({
        where: { id: kb.id },
        data: { vectorStoreId },
      });
    }

    // Confirm folder exists
    const stat = await fs.stat(folderPath).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json(
        { error: `Folder not found: ${path.relative(process.cwd(), folderPath)}` },
        { status: 400 }
      );
    }

    // Collect files on disk
    const entries = await fs.readdir(folderPath);
    const filePaths = entries
      .filter((f) => !f.startsWith("."))
      .map((f) => path.join(folderPath, f))
      .filter((p) => fssync.existsSync(p) && fssync.statSync(p).isFile());

    if (filePaths.length === 0) {
      return NextResponse.json({ error: "No files found in that folder." }, { status: 400 });
    }

    // Dedup by filename against BOTH Prisma and the vector store
    const existingDocs = await prisma.document.findMany({
      where: { kbId: kb.id },
      select: { filename: true },
    });
    const dbFilenames = new Set(existingDocs.map((d) => d.filename.trim()));

    let vsFilenames = new Set<string>();
    try {
      vsFilenames = await getVectorStoreAttachedFilenames(vectorStoreId);
    } catch {
      // If OpenAI list fails, still proceed with DB-only dedupe
      // (worst-case, duplicates could happen again, but this is best-effort hardening)
    }

    const existingFilenames = new Set<string>([...dbFilenames, ...vsFilenames]);

    const missing = filePaths
      .map((p) => ({ fullPath: p, filename: path.basename(p) }))
      .filter((f) => !existingFilenames.has(f.filename));

    if (missing.length === 0) {
      return NextResponse.json({
        kbId: kb.id,
        kbName: kb.name,
        vectorStoreId,
        addedCount: 0,
        message: "No new files to add (already up to date).",
      });
    }

    const createdDocs: { openaiFileId: string; filename: string }[] = [];

    for (const f of missing) {
      const uploaded = await openai.files.create({
        file: fssync.createReadStream(f.fullPath),
        purpose: "assistants",
      });

      await openai.vectorStores.files.create(vectorStoreId, { file_id: uploaded.id });

      createdDocs.push({ openaiFileId: uploaded.id, filename: f.filename });
    }

    // Wait for indexing
    while (true) {
      const current = await openai.vectorStores.retrieve(vectorStoreId);
      const inProgress = current.file_counts?.in_progress ?? 0;
      if (current.status === "completed" && inProgress === 0) break;
      await sleep(1500);
    }

    // Write Document rows (skipDuplicates not supported; per-row create + ignore P2002)
    let inserted = 0;
    for (const d of createdDocs) {
      try {
        await prisma.document.create({
          data: {
            ownerUserId: "system",
            kbId: kb.id,
            openaiFileId: d.openaiFileId,
            filename: d.filename,
            isCba: true,
            sharedToCbas: true,
          },
        });
        inserted += 1;
      } catch (e: any) {
        if (e?.code === "P2002") continue; // @@unique([kbId, filename])
        throw e;
      }
    }

    return NextResponse.json({
      kbId: kb.id,
      kbName: kb.name,
      vectorStoreId,
      addedCount: inserted,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}