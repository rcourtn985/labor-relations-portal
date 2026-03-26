import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const SHARED_CBAS_KB_ID = "cbas_shared";
const DEFAULT_OWNER_USER_ID = "system";

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const agreement = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        chapter: true,
        localUnion: true,
        cbaType: true,
        state: true,
        sharedToCbas: true,
        storageProvider: true,
        storageKey: true,
        mimeType: true,
        fileSizeBytes: true,
        sha256: true,
        kb: {
          select: {
            id: true,
            name: true,
          },
        },
        textContent: {
          select: {
            extractionState: true,
            extractedAt: true,
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    const hasStoredOriginal =
      agreement.storageProvider === "local" && Boolean(agreement.storageKey);

    return NextResponse.json({
      id: agreement.id,
      agreementName: agreement.kb?.name ?? "(untitled agreement)",
      collectionId: agreement.kb?.id ?? "",
      filename: agreement.filename ?? "",
      uploadedAt: Math.floor(agreement.createdAt.getTime() / 1000),
      chapter: agreement.chapter ?? "",
      localUnion: agreement.localUnion ?? "",
      agreementType: agreement.cbaType ?? "",
      states: agreement.state ?? "",
      sharedToCbas: Boolean(agreement.sharedToCbas),
      storageProvider: agreement.storageProvider ?? null,
      storageKey: agreement.storageKey ?? null,
      mimeType: agreement.mimeType ?? null,
      fileSizeBytes: agreement.fileSizeBytes ?? null,
      sha256: agreement.sha256 ?? null,
      extractionState: agreement.textContent?.extractionState ?? "missing",
      extractedAt: agreement.textContent?.extractedAt
        ? Math.floor(agreement.textContent.extractedAt.getTime() / 1000)
        : null,
      hasStoredOriginal,
      fileUrl: hasStoredOriginal
        ? `/api/agreements/${encodeURIComponent(agreement.id)}/file`
        : null,
      canPreviewInline:
        hasStoredOriginal &&
        Boolean(agreement.mimeType) &&
        (
          agreement.mimeType === "application/pdf" ||
          agreement.mimeType?.startsWith("text/")
        ),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const body = await req.json();

    const agreementName =
      typeof body.agreementName === "string" ? body.agreementName.trim() : "";
    const chapter = typeof body.chapter === "string" ? body.chapter.trim() : "";
    const localUnion =
      typeof body.localUnion === "string" ? body.localUnion.trim() : "";
    const agreementType =
      typeof body.agreementType === "string" ? body.agreementType.trim() : "";
    const states = typeof body.states === "string" ? body.states.trim() : "";
    const sharedToCbas = Boolean(body.sharedToCbas);

    const existing = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        kbId: true,
        filename: true,
        openaiFileId: true,
        isCba: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    await prisma.document.update({
      where: { id },
      data: {
        chapter: chapter || null,
        localUnion: localUnion || null,
        cbaType: agreementType || null,
        state: states || null,
        sharedToCbas,
      },
    });

    if (existing.filename) {
      await prisma.document.updateMany({
        where: {
          isCba: true,
          filename: existing.filename,
          NOT: {
            id: existing.id,
          },
        },
        data: {
          chapter: chapter || null,
          localUnion: localUnion || null,
          cbaType: agreementType || null,
          state: states || null,
          sharedToCbas,
        },
      });
    }

    if (existing.isCba && existing.filename) {
      const sharedKb = await prisma.knowledgeBase.findUnique({
        where: { id: SHARED_CBAS_KB_ID },
        select: { id: true },
      });

      if (!sharedKb) {
        return NextResponse.json(
          { error: "System KB 'cbas_shared' not found. Run seed." },
          { status: 500 }
        );
      }

      const existingSharedDoc = await prisma.document.findFirst({
        where: {
          kbId: SHARED_CBAS_KB_ID,
          filename: existing.filename,
        },
        select: {
          id: true,
        },
      });

      if (sharedToCbas) {
        if (!existingSharedDoc) {
          await prisma.document.create({
            data: {
              ownerUserId: DEFAULT_OWNER_USER_ID,
              kbId: SHARED_CBAS_KB_ID,
              openaiFileId: existing.openaiFileId,
              filename: existing.filename,
              isCba: true,
              chapter: chapter || null,
              localUnion: localUnion || null,
              cbaType: agreementType || null,
              state: states || null,
              sharedToCbas: true,
            },
          });
        } else {
          await prisma.document.update({
            where: { id: existingSharedDoc.id },
            data: {
              chapter: chapter || null,
              localUnion: localUnion || null,
              cbaType: agreementType || null,
              state: states || null,
              sharedToCbas: true,
            },
          });
        }
      } else {
        if (existingSharedDoc) {
          await prisma.document.delete({
            where: { id: existingSharedDoc.id },
          });
        }
      }
    }

    if (agreementName) {
      await prisma.knowledgeBase.update({
        where: { id: existing.kbId },
        data: {
          name: agreementName,
        },
      });
    }

    const updated = await prisma.document.findMany({
      where: {
        isCba: true,
        filename: existing.filename ?? undefined,
      },
      select: {
        id: true,
        filename: true,
        chapter: true,
        localUnion: true,
        cbaType: true,
        state: true,
        sharedToCbas: true,
        kb: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      updatedCount: updated.length,
      agreements: updated.map((doc) => ({
        id: doc.id,
        agreementName: doc.kb?.name ?? "",
        kbId: doc.kb?.id ?? "",
        filename: doc.filename ?? "",
        chapter: doc.chapter ?? "",
        localUnion: doc.localUnion ?? "",
        agreementType: doc.cbaType ?? "",
        states: doc.state ?? "",
        sharedToCbas: Boolean(doc.sharedToCbas),
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}