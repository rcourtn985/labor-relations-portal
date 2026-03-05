import { NextResponse } from "next/server";
import OpenAI from "openai";
import { readKBIndex } from "@/lib/kbIndex";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getUnderlyingFileId(vsf: any): string | null {
  // In your output, vsf.id is "file-xxxx" (the OpenAI file id).
  if (typeof vsf?.id === "string" && vsf.id.startsWith("file-")) return vsf.id;

  // Other possible shapes (keep as fallback)
  if (typeof vsf?.file_id === "string") return vsf.file_id;
  if (typeof vsf?.file?.id === "string") return vsf.file.id;

  return null;
}

export async function GET(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
    }

    const url = new URL(req.url);
    const kbId = url.searchParams.get("kbId");
    if (!kbId) {
      return NextResponse.json({ error: "Missing kbId query parameter." }, { status: 400 });
    }

    const index = await readKBIndex();
    const kb =
      kbId === "central"
        ? index.central
        : (index.userKbs ?? []).find((k) => k.id === kbId);

    if (!kb) {
      return NextResponse.json({ error: `Unknown kbId: ${kbId}` }, { status: 404 });
    }

    const vectorStoreId = kb.vectorStoreId;

    const list = await client.vectorStores.files.list(vectorStoreId, { limit: 100 });
    const items = list.data ?? [];

    const enriched = await Promise.all(
      items.map(async (vsf: any) => {
        const fileId = getUnderlyingFileId(vsf);

        let filename: string | null = null;
        let retrieveError: string | null = null;

        if (fileId) {
          try {
            const f = await client.files.retrieve(fileId);
            filename = (f as any)?.filename ?? (f as any)?.name ?? null;
          } catch (e: any) {
            retrieveError =
              e?.error?.message ??
              e?.response?.data?.error?.message ??
              e?.message ??
              "Failed to retrieve file details";
          }
        }

        return {
          id: vsf?.id ?? null,            // in your case: file-...
          file_id: fileId,                // will also be file-...
          filename,
          status: vsf?.status ?? null,
          created_at: vsf?.created_at ?? null,
          debug: {
            retrieveError,
          },
        };
      })
    );

    return NextResponse.json({
      kbId,
      kbName: kb.name,
      vectorStoreId,
      files: enriched,
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.error?.message ?? e?.message ?? "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}