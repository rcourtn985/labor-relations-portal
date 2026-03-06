import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

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
    const url = new URL(req.url);
    const kbId = url.searchParams.get("kbId");
    if (!kbId) {
      return NextResponse.json({ error: "Missing kbId query parameter." }, { status: 400 });
    }

    // Load KB from Prisma
    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } });
    if (!kb) {
      return NextResponse.json({ error: `Unknown kbId: ${kbId}` }, { status: 404 });
    }

    const vectorStoreId = kb.vectorStoreId;

    // SYSTEM KBs: list from OpenAI vector store
    if (kb.visibility === "SYSTEM") {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
      }
      if (!vectorStoreId || !vectorStoreId.startsWith("vs_")) {
        return NextResponse.json(
          { error: `KB ${kbId} has no valid vectorStoreId (expected vs_...)` },
          { status: 400 }
        );
      }

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
            id: vsf?.id ?? null, // in your case: file-...
            file_id: fileId, // will also be file-...
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
    }

    // PRIVATE KBs: list from Prisma Documents (fast + consistent)
    const docs = await prisma.document.findMany({
      where: { kbId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        openaiFileId: true,
        filename: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      kbId,
      kbName: kb.name,
      vectorStoreId,
      files: docs.map((d) => ({
        id: d.id,
        file_id: d.openaiFileId,
        filename: d.filename ?? null,
        status: "stored",
        created_at: Math.floor(d.createdAt.getTime() / 1000),
      })),
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.error?.message ?? e?.message ?? "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}