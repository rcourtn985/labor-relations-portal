import { NextResponse } from "next/server";
import { readKBIndex } from "@/lib/kbIndex";

export async function GET() {
  try {
    const index = await readKBIndex();
    return NextResponse.json(index);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to list KBs" },
      { status: 500 }
    );
  }
}