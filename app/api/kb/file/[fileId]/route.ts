import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(
  _req: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
    }

    const { fileId } = await context.params;

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId." }, { status: 400 });
    }

    const fileMeta = await client.files.retrieve(fileId);
    const filename =
      ((fileMeta as any)?.filename ?? (fileMeta as any)?.name ?? "downloaded-file").trim();

    const upstream = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => "Failed to retrieve file content.");
      return NextResponse.json(
        { error: errorText || "Failed to retrieve file content." },
        { status: upstream.status || 500 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: any) {
    const message = e?.error?.message ?? e?.message ?? "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}