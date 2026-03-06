import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import path from "path";
import { promises as fs } from "fs";
import fssync from "fs";
import formidable from "formidable";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // ensure Node runtime (needed for fs/formidable)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UPLOAD_TMP_DIR = path.join(process.cwd(), "tmp_uploads");

// Keep the MVP allowlist tight (you can expand later)
const ALLOWED_EXTS = new Set([".pdf", ".doc", ".docx", ".txt"]);

// For now (no auth yet), we attach created KBs + docs to the seeded "system" user.
const DEFAULT_OWNER_USER_ID = "system";

function safeId() {
  return `kb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function firstField(fields: any, key: string): string | undefined {
  const v = fields?.[key];
  if (Array.isArray(v)) return v[0];
  if (typeof v === "string") return v;
  return undefined;
}

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

async function getVectorStoreAttachedFilenames(vectorStoreId: string): Promise<Set<string>> {
  const names = new Set<string>();
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
      // best effort
    }
  }
  return names;
}

// Helper: parse multipart/form-data with formidable
async function parseForm(req: Request): Promise<{ fields: any; files: any }> {
  await fs.mkdir(UPLOAD_TMP_DIR, { recursive: true });

  const form = formidable({
    multiples: true,
    uploadDir: UPLOAD_TMP_DIR,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB per file for MVP
  });

  // formidable expects Node IncomingMessage; Next.js Request gives us a web stream.
  // We convert using a small adapter.
  const { Readable } = await import("stream");
  // @ts-ignore
  const nodeReq: any = Readable.fromWeb(req.body as any);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;

  return await new Promise((resolve, reject) => {
    form.parse(nodeReq, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function POST(req: Request) {
  let uploadedFiles: any[] = [];

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
    }

    const { fields, files } = await parseForm(req);

    const name = firstField(fields, "name");

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing 'name'." }, { status: 400 });
    }

    // CBA flags + metadata (applies to all files in this create action for MVP)
    const isCba = parseBool(firstField(fields, "isCba"));
    const shareToCbas = parseBool(firstField(fields, "shareToCbas"));

    const chapter = (firstField(fields, "chapter") ?? "").trim() || null;
    const localUnion = (firstField(fields, "localUnion") ?? "").trim() || null;
    const cbaType = (firstField(fields, "cbaType") ?? "").trim() || null;
    const state = (firstField(fields, "state") ?? "").trim() || null; // can be "LA, MS"

    const fileField = files?.files;
    uploadedFiles = Array.isArray(fileField) ? fileField : fileField ? [fileField] : [];

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    // Prevent duplicate KB names (simple MVP rule)
    const existing = await prisma.knowledgeBase.findFirst({
      where: { ownerUserId: DEFAULT_OWNER_USER_ID, name },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A knowledge base with that name already exists." },
        { status: 400 }
      );
    }

    // Create vector store for this KB
    const vs = await openai.vectorStores.create({ name: `User KB: ${name}` });

    // Upload each file to OpenAI Files API and attach
    const createdDocs: { openaiFileId: string; filename: string }[] = [];

    for (const f of uploadedFiles) {
      const filePath = f.filepath || f.path; // formidable v2/v3 differences
      if (!filePath) {
        return NextResponse.json({ error: "Upload missing temp filepath." }, { status: 400 });
      }

      const original =
        f.originalFilename || f.name || path.basename(filePath) || `upload_${Date.now()}`;

      const ext = path.extname(original).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) {
        return NextResponse.json(
          {
            error: `Unsupported file type: "${ext || "(none)"}". Allowed: ${Array.from(
              ALLOWED_EXTS
            ).join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Force OpenAI to receive the original filename (and extension)
      const fileForOpenAI = await toFile(fssync.createReadStream(filePath), original);

      const openaiFile = await openai.files.create({
        file: fileForOpenAI,
        purpose: "assistants",
      });

      await openai.vectorStores.files.create(vs.id, { file_id: openaiFile.id });

      createdDocs.push({
        openaiFileId: openaiFile.id,
        filename: original,
      });
    }

    // Wait for indexing to complete
    while (true) {
      const current = await openai.vectorStores.retrieve(vs.id);
      const inProgress = current.file_counts?.in_progress ?? 0;
      if (current.status === "completed" && inProgress === 0) break;
      await sleep(1500);
    }

    // Create KB row
    const id = safeId();

    await prisma.knowledgeBase.create({
      data: {
        id,
        name,
        vectorStoreId: vs.id,
        visibility: "PRIVATE",
        ownerUserId: DEFAULT_OWNER_USER_ID,
      },
    });

    // Create Document rows for the new KB (per-row create to play nice with uniqueness)
    for (const d of createdDocs) {
      try {
        await prisma.document.create({
          data: {
            ownerUserId: DEFAULT_OWNER_USER_ID,
            kbId: id,
            openaiFileId: d.openaiFileId,
            filename: d.filename,
            isCba,
            chapter,
            localUnion,
            cbaType,
            state,
            sharedToCbas: isCba && shareToCbas,
          },
        });
      } catch (e: any) {
        // @@unique([kbId, filename]) protection
        if (e?.code === "P2002") continue;
        throw e;
      }
    }

    // Optional: also add to system KB "All CBAs" (id stays cbas_shared)
    if (isCba && shareToCbas) {
      const allCbasKbId = "cbas_shared";

      const allCbas = await prisma.knowledgeBase.findUnique({ where: { id: allCbasKbId } });
      if (!allCbas) {
        return NextResponse.json(
          { error: "System KB 'cbas_shared' not found. Run seed." },
          { status: 500 }
        );
      }

      // Ensure vector store exists for All CBAs
      let allCbasVsId = allCbas.vectorStoreId;
      if (!allCbasVsId || !allCbasVsId.startsWith("vs_")) {
        const newVs = await openai.vectorStores.create({ name: `System KB: ${allCbas.name}` });
        allCbasVsId = newVs.id;
        await prisma.knowledgeBase.update({
          where: { id: allCbasKbId },
          data: { vectorStoreId: allCbasVsId },
        });
      }

      // Dedup against BOTH DB filenames and vector store filenames
      const existingAllCbasDocs = await prisma.document.findMany({
        where: { kbId: allCbasKbId },
        select: { filename: true },
      });
      const dbNames = new Set(existingAllCbasDocs.map((x) => x.filename.trim()));

      let vsNames = new Set<string>();
      try {
        vsNames = await getVectorStoreAttachedFilenames(allCbasVsId);
      } catch {
        // best effort; DB-only dedupe still prevents most duplicates
      }

      const alreadyThere = new Set<string>([...dbNames, ...vsNames]);

      for (const d of createdDocs) {
        // If the filename already exists in All CBAs, skip attaching/creating
        if (alreadyThere.has(d.filename.trim())) continue;

        // Attach the SAME OpenAI file to the All CBAs vector store
        await openai.vectorStores.files.create(allCbasVsId, { file_id: d.openaiFileId });

        // Write the system Document row
        try {
          await prisma.document.create({
            data: {
              ownerUserId: DEFAULT_OWNER_USER_ID, // you seeded "system" user
              kbId: allCbasKbId,
              openaiFileId: d.openaiFileId,
              filename: d.filename,
              isCba: true,
              chapter,
              localUnion,
              cbaType,
              state,
              sharedToCbas: true,
            },
          });
        } catch (e: any) {
          if (e?.code !== "P2002") throw e;
        }
      }
    }

    return NextResponse.json({ id, name, vectorStoreId: vs.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  } finally {
    // Cleanup temp files (best effort)
    for (const f of uploadedFiles) {
      const filePath = f?.filepath || f?.path;
      if (filePath) {
        fs.unlink(filePath).catch(() => {});
      }
    }
  }
}