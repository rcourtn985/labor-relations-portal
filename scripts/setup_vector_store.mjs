import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KB_DIR = path.join(process.cwd(), "kb");
const STORE_NAME = "labor-relations-kb";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Put it in .env.local");
  }

  // 1) Create vector store (JS SDK uses vectorStores)
  const vectorStore = await openai.vectorStores.create({ name: STORE_NAME });
  console.log("Vector store created:", vectorStore.id);

  // 2) Upload files + attach to vector store
  const files = fs.readdirSync(KB_DIR).filter((f) => !f.startsWith("."));
  if (files.length === 0) {
    throw new Error(`No files found in ${KB_DIR}`);
  }

  for (const filename of files) {
    const full = path.join(KB_DIR, filename);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;

    console.log("Uploading:", filename);

    const uploaded = await openai.files.create({
      file: fs.createReadStream(full),
      purpose: "assistants",
    });

    // Attach file to vector store (JS SDK signature shown in docs)
    await openai.vectorStores.files.create(vectorStore.id, {
      file_id: uploaded.id,
    });
  }

  // 3) Poll until processing completes
  while (true) {
    const vs = await openai.vectorStores.retrieve(vectorStore.id);

    const inProgress = vs.file_counts?.in_progress ?? 0;
    const failed = vs.file_counts?.failed ?? 0;

    console.log(
      "Vector store status:",
      vs.status,
      "| in_progress:",
      inProgress,
      "| failed:",
      failed,
      "| completed:",
      vs.file_counts?.completed ?? 0
    );

    if (vs.status === "completed" && inProgress === 0) break;
    await sleep(2000);
  }

  console.log("\nDONE ✅");
  console.log("Add this to .env.local:");
  console.log(`VECTOR_STORE_ID=${vectorStore.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});