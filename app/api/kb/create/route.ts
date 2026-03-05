import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import path from "path";
import { promises as fs } from "fs";
import fssync from "fs";
import formidable from "formidable";

export const runtime = "nodejs"; // ensure Node runtime (needed for fs/formidable)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KB_INDEX_PATH = path.join(process.cwd(), "data", "kb-index.json");
const UPLOAD_TMP_DIR = path.join(process.cwd(), "tmp_uploads");

// Keep the MVP allowlist tight (you can expand later)
const ALLOWED_EXTS = new Set([".pdf", ".doc", ".docx", ".txt"]);

async function readIndex() {
  const raw = await fs.readFile(KB_INDEX_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeIndex(index: any) {
  await fs.mkdir(path.dirname(KB_INDEX_PATH), { recursive: true });
  await fs.writeFile(KB_INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

function safeId() {
  return `kb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

    const nameRaw = fields?.name;
    const name = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing 'name'." }, { status: 400 });
    }

    const fileField = files?.files;
    uploadedFiles = Array.isArray(fileField) ? fileField : fileField ? [fileField] : [];

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    // Prevent duplicate KB names (simple MVP rule)
    const index = await readIndex();
    const dup =
      index.central?.name === name ||
      (index.userKbs ?? []).some((k: any) => k.name === name);

    if (dup) {
      return NextResponse.json(
        { error: "A knowledge base with that name already exists." },
        { status: 400 }
      );
    }

    // Create vector store
    const vs = await openai.vectorStores.create({ name: `User KB: ${name}` });

    // Upload each file to OpenAI Files API and attach
    for (const f of uploadedFiles) {
      const filePath = f.filepath || f.path; // formidable v2/v3 differences
      if (!filePath) {
        return NextResponse.json({ error: "Upload missing temp filepath." }, { status: 400 });
      }

      const original =
        f.originalFilename ||
        f.name ||
        path.basename(filePath) ||
        `upload_${Date.now()}`;

      const ext = path.extname(original).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) {
        return NextResponse.json(
          { error: `Unsupported file type: "${ext || "(none)"}". Allowed: ${Array.from(ALLOWED_EXTS).join(", ")}` },
          { status: 400 }
        );
      }

      // ✅ Key fix: force OpenAI to receive the original filename (and extension)
      const fileForOpenAI = await toFile(fssync.createReadStream(filePath), original);

      const openaiFile = await openai.files.create({
        file: fileForOpenAI,
        purpose: "assistants",
      });

      await openai.vectorStores.files.create(vs.id, { file_id: openaiFile.id });
    }

    // Wait for indexing to complete
    while (true) {
      const current = await openai.vectorStores.retrieve(vs.id);
      const inProgress = current.file_counts?.in_progress ?? 0;
      if (current.status === "completed" && inProgress === 0) break;
      await sleep(1500);
    }

    // Update kb-index.json
    const id = safeId();
    index.userKbs = index.userKbs ?? [];
    index.userKbs.push({
      id,
      name,
      vectorStoreId: vs.id,
      createdAt: new Date().toISOString(),
    });

    await writeIndex(index);

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