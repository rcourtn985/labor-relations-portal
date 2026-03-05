import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";
import { promises as fs } from "fs";
import fssync from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KB_UPLOADS_DIR = path.join(process.cwd(), "kb_user_uploads");
const KB_INDEX_PATH = path.join(process.cwd(), "data", "kb-index.json");

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

export async function POST(req: Request) {
  try {
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

    // Collect files
    const entries = await fs.readdir(folderPath);
    const files = entries
      .filter((f) => !f.startsWith("."))
      .map((f) => path.join(folderPath, f))
      .filter((p) => fssync.existsSync(p) && fssync.statSync(p).isFile());

    if (files.length === 0) {
      return NextResponse.json({ error: "No files found in that folder." }, { status: 400 });
    }

    // Create vector store
    const vs = await openai.vectorStores.create({ name: `User KB: ${name}` });

    // Upload + attach
    for (const fullPath of files) {
      const uploaded = await openai.files.create({
        file: fssync.createReadStream(fullPath),
        purpose: "assistants",
      });

      await openai.vectorStores.files.create(vs.id, { file_id: uploaded.id });
    }

    // Wait for indexing
    while (true) {
      const current = await openai.vectorStores.retrieve(vs.id);
      const inProgress = current.file_counts?.in_progress ?? 0;
      if (current.status === "completed" && inProgress === 0) break;
      await sleep(1500);
    }

    // Write to kb-index
    const index = await readIndex();

    // Prevent duplicate names (simple rule for MVP)
    const exists = (index.userKbs ?? []).some((k: any) => k.name === name);
    if (exists) {
      return NextResponse.json(
        { error: "A knowledge base with that name already exists." },
        { status: 400 }
      );
    }

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
  }
}