import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const KB_INDEX_PATH = path.join(process.cwd(), "data", "kb-index.json");

export async function GET() {
  try {
    const raw = await fs.readFile(KB_INDEX_PATH, "utf8");
    const index = JSON.parse(raw);
    return NextResponse.json(index);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Could not read kb-index.json" },
      { status: 500 }
    );
  }
}