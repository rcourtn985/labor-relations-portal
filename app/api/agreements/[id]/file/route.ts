import path from "path";
import { promises as fs } from "fs";
import { prisma } from "@/lib/prisma";
import { getLocalStoredFilePath } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function contentDispositionType(
  mimeType: string | null
): "inline" | "attachment" {
  if (!mimeType) return "attachment";
  if (mimeType === "application/pdf") return "inline";
  if (mimeType.startsWith("text/")) return "inline";
  return "attachment";
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing agreement id." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agreement = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        storageProvider: true,
        storageKey: true,
        mimeType: true,
      },
    });

    if (!agreement) {
      return new Response(JSON.stringify({ error: "Agreement not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (agreement.storageProvider !== "local" || !agreement.storageKey) {
      return new Response(
        JSON.stringify({
          error: "Stored original file is not available for this agreement.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const fullPath = getLocalStoredFilePath(agreement.storageKey);

    const resolvedStorageRoot = path.resolve(
      process.cwd(),
      "storage",
      "originals"
    );
    const resolvedFilePath = path.resolve(fullPath);

    if (
      resolvedFilePath !== resolvedStorageRoot &&
      !resolvedFilePath.startsWith(`${resolvedStorageRoot}${path.sep}`)
    ) {
      return new Response(JSON.stringify({ error: "Invalid storage path." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let fileBuffer: Buffer;

    try {
      fileBuffer = await fs.readFile(resolvedFilePath);
    } catch {
      return new Response(
        JSON.stringify({ error: "Stored file not found on disk." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mimeType = agreement.mimeType || "application/octet-stream";
    const disposition = contentDispositionType(agreement.mimeType);
    const safeFilename = (agreement.filename || "agreement")
      .replace(/[\r\n"]/g, "_")
      .trim();

    const fileBytes = new Uint8Array(fileBuffer);

    return new Response(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}