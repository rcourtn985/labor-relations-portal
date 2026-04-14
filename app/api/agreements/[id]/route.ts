import { NextResponse } from "next/server";
import {
  requireAuth,
  isSystemAdmin,
  getActiveChapterAdminChapterIds,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCanonicalAgreementKey } from "@/lib/agreements/canonical";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SHARED_CBAS_KB_ID = "cbas_shared";
const DEFAULT_OWNER_USER_ID = "system";

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeChapterKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function buildUpdatedCanonicalKey(params: {
  filename: string | null | undefined;
  chapter: string | null | undefined;
  localUnion: string | null | undefined;
  agreementType: string | null | undefined;
  states: string | null | undefined;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
}) {
  return buildCanonicalAgreementKey({
    filename: params.filename,
    chapter: params.chapter,
    localUnion: params.localUnion,
    cbaType: params.agreementType,
    state: params.states,
    effectiveFrom: params.effectiveFrom,
    effectiveTo: params.effectiveTo,
  });
}

async function resolveDocumentForAgreementView(id: string) {
  const directDocument = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      agreementId: true,
      filename: true,
      createdAt: true,
      chapter: true,
      localUnion: true,
      cbaType: true,
      state: true,
      sharedToCbas: true,
      effectiveFrom: true,
      effectiveTo: true,
      storageProvider: true,
      storageKey: true,
      mimeType: true,
      fileSizeBytes: true,
      sha256: true,
      kb: { select: { id: true, name: true } },
      textContent: { select: { extractionState: true, extractedAt: true } },
      agreement: {
        select: {
          id: true,
          name: true,
          sourceFilename: true,
          chapter: true,
          localUnion: true,
          cbaType: true,
          state: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      },
    },
  });

  if (directDocument) {
    return directDocument;
  }

  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sourceFilename: true,
      chapter: true,
      localUnion: true,
      cbaType: true,
      state: true,
      effectiveFrom: true,
      effectiveTo: true,
      documents: {
        where: {
          deletedAt: null,
          isCba: true,
        },
        select: {
          id: true,
          agreementId: true,
          filename: true,
          createdAt: true,
          chapter: true,
          localUnion: true,
          cbaType: true,
          state: true,
          sharedToCbas: true,
          effectiveFrom: true,
          effectiveTo: true,
          storageProvider: true,
          storageKey: true,
          mimeType: true,
          fileSizeBytes: true,
          sha256: true,
          kb: { select: { id: true, name: true } },
          textContent: { select: { extractionState: true, extractedAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agreement) {
    return null;
  }

  const representative = [...agreement.documents].sort((a, b) => {
    const aIsNational = a.kb?.id === SHARED_CBAS_KB_ID;
    const bIsNational = b.kb?.id === SHARED_CBAS_KB_ID;

    if (aIsNational !== bIsNational) {
      return aIsNational ? 1 : -1;
    }

    const aHasStoredOriginal =
      a.storageProvider === "local" && Boolean(a.storageKey);
    const bHasStoredOriginal =
      b.storageProvider === "local" && Boolean(b.storageKey);

    if (aHasStoredOriginal !== bHasStoredOriginal) {
      return aHasStoredOriginal ? -1 : 1;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];

  if (!representative) {
    return null;
  }

  return {
    ...representative,
    agreement: {
      id: agreement.id,
      name: agreement.name,
      sourceFilename: agreement.sourceFilename,
      chapter: agreement.chapter,
      localUnion: agreement.localUnion,
      cbaType: agreement.cbaType,
      state: agreement.state,
      effectiveFrom: agreement.effectiveFrom,
      effectiveTo: agreement.effectiveTo,
    },
  };
}

async function resolveAgreementTarget(id: string) {
  const directDocument = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      agreementId: true,
      kbId: true,
      filename: true,
      openaiFileId: true,
      isCba: true,
      chapter: true,
      storageProvider: true,
      storageKey: true,
      createdAt: true,
    },
  });

  if (directDocument) {
    if (directDocument.agreementId) {
      const agreement = await prisma.agreement.findUnique({
        where: { id: directDocument.agreementId },
        select: {
          id: true,
          name: true,
          sourceFilename: true,
          chapter: true,
          localUnion: true,
          cbaType: true,
          state: true,
          effectiveFrom: true,
          effectiveTo: true,
          documents: {
            where: {
              deletedAt: null,
              isCba: true,
              agreementId: directDocument.agreementId,
            },
            select: {
              id: true,
              kbId: true,
              filename: true,
              openaiFileId: true,
              chapter: true,
              localUnion: true,
              cbaType: true,
              state: true,
              sharedToCbas: true,
              effectiveFrom: true,
              effectiveTo: true,
              storageProvider: true,
              storageKey: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (agreement) {
        return {
          mode: "canonical" as const,
          agreement,
          representativeDocumentId: directDocument.id,
        };
      }
    }

    return {
      mode: "document" as const,
      document: directDocument,
    };
  }

  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sourceFilename: true,
      chapter: true,
      localUnion: true,
      cbaType: true,
      state: true,
      effectiveFrom: true,
      effectiveTo: true,
      documents: {
        where: {
          deletedAt: null,
          isCba: true,
        },
        select: {
          id: true,
          kbId: true,
          filename: true,
          openaiFileId: true,
          chapter: true,
          localUnion: true,
          cbaType: true,
          state: true,
          sharedToCbas: true,
          effectiveFrom: true,
          effectiveTo: true,
          storageProvider: true,
          storageKey: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agreement) {
    return null;
  }

  return {
    mode: "canonical" as const,
    agreement,
    representativeDocumentId: agreement.documents[0]?.id ?? null,
  };
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const agreement = await resolveDocumentForAgreementView(id);

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    const hasStoredOriginal =
      agreement.storageProvider === "local" && Boolean(agreement.storageKey);

    const canonicalId = agreement.agreement?.id ?? agreement.id;

    return NextResponse.json({
      id: canonicalId,
      documentId: agreement.id,
      agreementId: agreement.agreement?.id ?? agreement.agreementId ?? null,
      agreementName:
        agreement.agreement?.name ??
        agreement.kb?.name ??
        "(untitled agreement)",
      collectionId: agreement.kb?.id ?? "",
      filename: agreement.filename ?? "",
      uploadedAt: Math.floor(agreement.createdAt.getTime() / 1000),
      chapter: agreement.agreement?.chapter ?? agreement.chapter ?? "",
      localUnion: agreement.agreement?.localUnion ?? agreement.localUnion ?? "",
      agreementType: agreement.agreement?.cbaType ?? agreement.cbaType ?? "",
      states: agreement.agreement?.state ?? agreement.state ?? "",
      sharedToCbas: Boolean(agreement.sharedToCbas),
      effectiveFrom: agreement.agreement?.effectiveFrom
        ? agreement.agreement.effectiveFrom.toISOString()
        : agreement.effectiveFrom
          ? agreement.effectiveFrom.toISOString()
          : null,
      effectiveTo: agreement.agreement?.effectiveTo
        ? agreement.agreement.effectiveTo.toISOString()
        : agreement.effectiveTo
          ? agreement.effectiveTo.toISOString()
          : null,
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
        ? `/api/agreements/${encodeURIComponent(canonicalId)}/file`
        : null,
      canPreviewInline:
        hasStoredOriginal &&
        Boolean(agreement.mimeType) &&
        (agreement.mimeType === "application/pdf" ||
          agreement.mimeType?.startsWith("text/")),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const canManageAsSystemAdmin = isSystemAdmin(session);
    const chapterAdminIds = getActiveChapterAdminChapterIds(session);
    const chapterAdminNames = (session.user.memberships ?? [])
      .filter(
        (membership: { role: "CHAPTER_ADMIN" | "USER" }) =>
          membership.role === "CHAPTER_ADMIN"
      )
      .map((membership: { chapterName: string }) =>
        normalizeChapterKey(membership.chapterName)
      )
      .filter(Boolean);

    if (!canManageAsSystemAdmin && chapterAdminIds.length === 0) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const target = await resolveAgreementTarget(id);

    if (!target) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
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
    const effectiveFrom = parseDate(body.effectiveFrom);
    const effectiveTo = parseDate(body.effectiveTo);

    if (target.mode === "document") {
      const existing = target.document;

      if (!canManageAsSystemAdmin) {
        const allowedChapterKeys = new Set(chapterAdminNames);

        const existingChapterKey = normalizeChapterKey(existing.chapter);
        const requestedChapterKey = normalizeChapterKey(chapter);

        if (
          !existingChapterKey ||
          !requestedChapterKey ||
          !allowedChapterKeys.has(existingChapterKey) ||
          !allowedChapterKeys.has(requestedChapterKey)
        ) {
          return NextResponse.json(
            { error: "Chapter Admins can only edit agreements for assigned chapters." },
            { status: 403 }
          );
        }
      }

      await prisma.document.update({
        where: { id: existing.id },
        data: {
          chapter: chapter || null,
          localUnion: localUnion || null,
          cbaType: agreementType || null,
          state: states || null,
          sharedToCbas,
          effectiveFrom,
          effectiveTo,
        },
      });

      if (existing.filename) {
        await prisma.document.updateMany({
          where: {
            isCba: true,
            filename: existing.filename,
            NOT: { id: existing.id },
          },
          data: {
            chapter: chapter || null,
            localUnion: localUnion || null,
            cbaType: agreementType || null,
            state: states || null,
            sharedToCbas,
            effectiveFrom,
            effectiveTo,
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
          where: { kbId: SHARED_CBAS_KB_ID, filename: existing.filename },
          select: { id: true },
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
                effectiveFrom,
                effectiveTo,
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
                effectiveFrom,
                effectiveTo,
              },
            });
          }
        } else if (existingSharedDoc) {
          await prisma.document.delete({ where: { id: existingSharedDoc.id } });
        }
      }

      if (agreementName) {
        await prisma.knowledgeBase.update({
          where: { id: existing.kbId },
          data: { name: agreementName },
        });
      }

      const updated = await prisma.document.findMany({
        where: { isCba: true, filename: existing.filename ?? undefined },
        select: {
          id: true,
          filename: true,
          chapter: true,
          localUnion: true,
          cbaType: true,
          state: true,
          sharedToCbas: true,
          effectiveFrom: true,
          effectiveTo: true,
          kb: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        ok: true,
        mode: "document",
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
          effectiveFrom: doc.effectiveFrom ? doc.effectiveFrom.toISOString() : null,
          effectiveTo: doc.effectiveTo ? doc.effectiveTo.toISOString() : null,
        })),
      });
    }

    const agreement = target.agreement;
    const docs = agreement.documents;

    if (docs.length === 0) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    if (!canManageAsSystemAdmin) {
      const allowedChapterKeys = new Set(chapterAdminNames);

      const existingChapterKeys = new Set(
        docs.map((doc) => normalizeChapterKey(doc.chapter)).filter(Boolean)
      );
      const requestedChapterKey = normalizeChapterKey(chapter);

      if (
        !requestedChapterKey ||
        [...existingChapterKeys].some((key) => !allowedChapterKeys.has(key)) ||
        !allowedChapterKeys.has(requestedChapterKey)
      ) {
        return NextResponse.json(
          { error: "Chapter Admins can only edit agreements for assigned chapters." },
          { status: 403 }
        );
      }
    }

    const representativeDoc = [...docs].sort((a, b) => {
      const aIsNational = a.kbId === SHARED_CBAS_KB_ID;
      const bIsNational = b.kbId === SHARED_CBAS_KB_ID;
      if (aIsNational !== bIsNational) return aIsNational ? 1 : -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })[0];

    const sourceFilename =
      normalizeValue(representativeDoc?.filename) ||
      normalizeValue(agreement.sourceFilename) ||
      null;

    const nextCanonicalKey = buildUpdatedCanonicalKey({
      filename: sourceFilename,
      chapter: chapter || null,
      localUnion: localUnion || null,
      agreementType: agreementType || null,
      states: states || null,
      effectiveFrom,
      effectiveTo,
    });

    const conflictingAgreement = nextCanonicalKey
      ? await prisma.agreement.findUnique({
          where: { canonicalKey: nextCanonicalKey },
          select: { id: true },
        })
      : null;

    if (
      conflictingAgreement &&
      conflictingAgreement.id !== agreement.id
    ) {
      return NextResponse.json(
        {
          error:
            "Another canonical agreement already exists with the same filename and agreement metadata.",
        },
        { status: 409 }
      );
    }

    await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        name: agreementName || agreement.name,
        canonicalKey: nextCanonicalKey || agreement.id,
        sourceFilename,
        chapter: chapter || null,
        localUnion: localUnion || null,
        cbaType: agreementType || null,
        state: states || null,
        effectiveFrom,
        effectiveTo,
      },
    });

    await prisma.document.updateMany({
      where: {
        agreementId: agreement.id,
        isCba: true,
      },
      data: {
        chapter: chapter || null,
        localUnion: localUnion || null,
        cbaType: agreementType || null,
        state: states || null,
        sharedToCbas,
        effectiveFrom,
        effectiveTo,
      },
    });

    const sharedDoc = docs.find((doc) => doc.kbId === SHARED_CBAS_KB_ID);
    const nonSharedDocs = docs.filter((doc) => doc.kbId !== SHARED_CBAS_KB_ID);

    if (sharedToCbas) {
      if (!sharedDoc && representativeDoc) {
        await prisma.document.create({
          data: {
            ownerUserId: DEFAULT_OWNER_USER_ID,
            kbId: SHARED_CBAS_KB_ID,
            agreementId: agreement.id,
            openaiFileId: representativeDoc.openaiFileId,
            filename: representativeDoc.filename,
            isCba: true,
            chapter: chapter || null,
            localUnion: localUnion || null,
            cbaType: agreementType || null,
            state: states || null,
            sharedToCbas: true,
            effectiveFrom,
            effectiveTo,
            storageProvider: representativeDoc.storageProvider,
            storageKey: representativeDoc.storageKey,
          },
        });
      }
    } else if (sharedDoc) {
      await prisma.document.delete({
        where: { id: sharedDoc.id },
      });
    }

    const updatedDocs = await prisma.document.findMany({
      where: {
        agreementId: agreement.id,
        isCba: true,
        deletedAt: null,
      },
      select: {
        id: true,
        filename: true,
        chapter: true,
        localUnion: true,
        cbaType: true,
        state: true,
        sharedToCbas: true,
        effectiveFrom: true,
        effectiveTo: true,
        kb: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      mode: "canonical",
      updatedCount: updatedDocs.length,
      agreement: {
        id: agreement.id,
        agreementName: agreementName || agreement.name,
        filename: sourceFilename ?? "",
        chapter: chapter || "",
        localUnion: localUnion || "",
        agreementType: agreementType || "",
        states: states || "",
        sharedToCbas,
        effectiveFrom: effectiveFrom ? effectiveFrom.toISOString() : null,
        effectiveTo: effectiveTo ? effectiveTo.toISOString() : null,
      },
      documents: updatedDocs.map((doc) => ({
        id: doc.id,
        agreementName: doc.kb?.name ?? "",
        kbId: doc.kb?.id ?? "",
        filename: doc.filename ?? "",
        chapter: doc.chapter ?? "",
        localUnion: doc.localUnion ?? "",
        agreementType: doc.cbaType ?? "",
        states: doc.state ?? "",
        sharedToCbas: Boolean(doc.sharedToCbas),
        effectiveFrom: doc.effectiveFrom ? doc.effectiveFrom.toISOString() : null,
        effectiveTo: doc.effectiveTo ? doc.effectiveTo.toISOString() : null,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const canManageAsSystemAdmin = isSystemAdmin(session);
    const chapterAdminIds = getActiveChapterAdminChapterIds(session);
    const chapterAdminNames = (session.user.memberships ?? [])
      .filter(
        (membership: { role: "CHAPTER_ADMIN" | "USER" }) =>
          membership.role === "CHAPTER_ADMIN"
      )
      .map((membership: { chapterName: string }) =>
        normalizeChapterKey(membership.chapterName)
      )
      .filter(Boolean);

    if (!canManageAsSystemAdmin && chapterAdminIds.length === 0) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const target = await resolveAgreementTarget(id);

    if (!target) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    if (target.mode === "document") {
      const doc = target.document;

      if (!canManageAsSystemAdmin) {
        const allowedChapterKeys = new Set(chapterAdminNames);
        if (!allowedChapterKeys.has(normalizeChapterKey(doc.chapter))) {
          return NextResponse.json(
            { error: "Chapter Admins can only delete agreements for assigned chapters." },
            { status: 403 }
          );
        }
      }

      if (doc.isCba && doc.filename) {
        const sharedCopy = await prisma.document.findFirst({
          where: { kbId: SHARED_CBAS_KB_ID, filename: doc.filename },
          select: { id: true },
        });
        if (sharedCopy) {
          await prisma.document.delete({ where: { id: sharedCopy.id } });
        }
      }

      await prisma.document.delete({ where: { id: doc.id } });

      const remainingDocs = await prisma.document.count({ where: { kbId: doc.kbId } });
      if (remainingDocs === 0) {
        await prisma.knowledgeBase.delete({ where: { id: doc.kbId } }).catch(() => {});
      }

      if (doc.storageProvider === "local" && doc.storageKey) {
        const nodePath = await import("path");
        const { promises: nodeFs } = await import("fs");
        const { getLocalStoredFilePath } = await import("@/lib/storage");
        const fullPath = getLocalStoredFilePath(doc.storageKey);
        const dir = nodePath.default.dirname(fullPath);
        await nodeFs.rm(dir, { recursive: true, force: true }).catch(() => {});
      }

      return NextResponse.json({ ok: true, mode: "document" });
    }

    const agreement = target.agreement;
    const docs = agreement.documents;

    if (!canManageAsSystemAdmin) {
      const allowedChapterKeys = new Set(chapterAdminNames);
      const existingChapterKeys = new Set(
        docs.map((doc) => normalizeChapterKey(doc.chapter)).filter(Boolean)
      );

      if ([...existingChapterKeys].some((key) => !allowedChapterKeys.has(key))) {
        return NextResponse.json(
          { error: "Chapter Admins can only delete agreements for assigned chapters." },
          { status: 403 }
        );
      }
    }

    const kbIds = [...new Set(docs.map((doc) => doc.kbId).filter(Boolean))];
    const localStorageDocs = docs.filter(
      (doc) => doc.storageProvider === "local" && doc.storageKey
    );

    await prisma.document.deleteMany({
      where: {
        agreementId: agreement.id,
      },
    });

    await prisma.agreement.delete({
      where: { id: agreement.id },
    });

    for (const kbId of kbIds) {
      const remainingDocs = await prisma.document.count({ where: { kbId } });
      if (remainingDocs === 0 && kbId !== SHARED_CBAS_KB_ID) {
        await prisma.knowledgeBase.delete({ where: { id: kbId } }).catch(() => {});
      }
    }

    for (const doc of localStorageDocs) {
      if (!doc.storageKey) continue;
      const nodePath = await import("path");
      const { promises: nodeFs } = await import("fs");
      const { getLocalStoredFilePath } = await import("@/lib/storage");
      const fullPath = getLocalStoredFilePath(doc.storageKey);
      const dir = nodePath.default.dirname(fullPath);
      await nodeFs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      mode: "canonical",
      deletedAgreementId: agreement.id,
      deletedDocumentCount: docs.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}