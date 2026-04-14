import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { prisma } from "@/lib/prisma";
import { storeOriginalFile } from "@/lib/storage";
import { extractTextFromFile } from "@/lib/text-extraction";
import { buildCanonicalAgreementKey } from "@/lib/agreements/canonical";
import {
  getActiveChapterAdminChapterIds,
  isSystemAdmin,
  requireAuth,
} from "@/lib/auth";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_EXTS = new Set([".pdf", ".doc", ".docx", ".txt"]);
const DEFAULT_OWNER_USER_ID = "system";

function safeId() {
  return `kb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseBool(v: FormDataEntryValue | null): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function getString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function getFiles(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

async function getVectorStoreAttachedFilenames(
  vectorStoreId: string
): Promise<Set<string>> {
  const names = new Set<string>();
  const list = await openai.vectorStores.files.list(vectorStoreId, { limit: 100 });
  const items = list.data ?? [];

  for (const it of items) {
    const fileId = (it as { id?: string })?.id;
    if (!fileId) continue;
    try {
      const f = await openai.files.retrieve(fileId);
      const filename = (
        (f as { filename?: string; name?: string })?.filename ??
        (f as { filename?: string; name?: string })?.name ??
        ""
      ).trim();
      if (filename) names.add(filename);
    } catch {
      // best effort
    }
  }

  return names;
}

type PreparedDocument = {
  openaiFileId: string;
  filename: string;
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  sha256: string | null;
  extractedText: string;
  extractionState: string;
};

async function getOrCreateAgreement(params: {
  kbName: string;
  filename: string;
  chapter: string | null;
  localUnion: string | null;
  cbaType: string | null;
  state: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
}): Promise<string | null> {
  const canonicalKey = buildCanonicalAgreementKey({
    filename: params.filename,
    chapter: params.chapter,
    localUnion: params.localUnion,
    cbaType: params.cbaType,
    state: params.state,
    effectiveFrom: params.effectiveFrom,
    effectiveTo: params.effectiveTo,
  });

  if (!canonicalKey) {
    return null;
  }

  const name = normalizeValue(params.kbName) || normalizeValue(params.filename) || "(untitled agreement)";

  const existing = await prisma.agreement.findUnique({
    where: { canonicalKey },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  try {
    const created = await prisma.agreement.create({
      data: {
        name,
        canonicalKey,
        sourceFilename: normalizeValue(params.filename) || null,
        chapter: normalizeValue(params.chapter) || null,
        localUnion: normalizeValue(params.localUnion) || null,
        cbaType: normalizeValue(params.cbaType) || null,
        state: normalizeValue(params.state) || null,
        effectiveFrom: params.effectiveFrom,
        effectiveTo: params.effectiveTo,
      },
      select: { id: true },
    });

    return created.id;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      const raced = await prisma.agreement.findUnique({
        where: { canonicalKey },
        select: { id: true },
      });

      return raced?.id ?? null;
    }

    throw error;
  }
}

export async function POST(req: Request) {
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
      .map(
        (membership: { chapterName: string }) =>
          membership.chapterName.trim().toLowerCase()
      )
      .filter(Boolean);

    if (!canManageAsSystemAdmin && chapterAdminIds.length === 0) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY missing." },
        { status: 500 }
      );
    }

    const formData = await req.formData();

    const name = getString(formData, "name");
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Missing 'name'." }, { status: 400 });
    }

    const trimmedName = name.trim();

    const isCba = parseBool(formData.get("isCba"));
    const shareToCbas = parseBool(formData.get("shareToCbas"));

    const chapter = getString(formData, "chapter")?.trim() || null;
    const localUnion = getString(formData, "localUnion")?.trim() || null;
    const cbaType = getString(formData, "cbaType")?.trim() || null;
    const state = getString(formData, "state")?.trim() || null;
    const effectiveFrom = parseDate(getString(formData, "effectiveFrom"));
    const effectiveTo = parseDate(getString(formData, "effectiveTo"));

    if (!canManageAsSystemAdmin) {
      const allowedChapterNames = new Set(chapterAdminNames);
      const chapterKey = chapter?.trim().toLowerCase() ?? "";

      if (!chapterKey || !allowedChapterNames.has(chapterKey)) {
        return NextResponse.json(
          { error: "Chapter Admins can only upload agreements for assigned chapters." },
          { status: 403 }
        );
      }
    }

    const uploadedFiles = getFiles(formData, "files");

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const existing = await prisma.knowledgeBase.findFirst({
      where: { ownerUserId: DEFAULT_OWNER_USER_ID, name: trimmedName },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A knowledge base with that name already exists." },
        { status: 400 }
      );
    }

    const vs = await openai.vectorStores.create({ name: `User KB: ${trimmedName}` });

    const preparedDocs: PreparedDocument[] = [];

    for (const file of uploadedFiles) {
      const original = file.name?.trim() || `upload_${Date.now()}`;
      const ext = getExtension(original);

      if (!ALLOWED_EXTS.has(ext)) {
        return NextResponse.json(
          {
            error: `Unsupported file type: "${ext || "(none)"}". Allowed: ${Array.from(ALLOWED_EXTS).join(", ")}`,
          },
          { status: 400 }
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());

      const stored = await storeOriginalFile({
        filename: original,
        bytes,
        mimeType: file.type || null,
      });

      const extracted = await extractTextFromFile({
        filename: original,
        bytes,
        mimeType: file.type || null,
      });

      const fileForOpenAI = await toFile(bytes, original);

      const openaiFile = await openai.files.create({
        file: fileForOpenAI,
        purpose: "assistants",
      });

      await openai.vectorStores.files.create(vs.id, { file_id: openaiFile.id });

      preparedDocs.push({
        openaiFileId: openaiFile.id,
        filename: original,
        storageProvider: stored.provider,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        fileSizeBytes: stored.fileSizeBytes,
        sha256: stored.sha256,
        extractedText: extracted.extractedText,
        extractionState: extracted.extractionState,
      });
    }

    while (true) {
      const current = await openai.vectorStores.retrieve(vs.id);
      const inProgress = current.file_counts?.in_progress ?? 0;
      if (current.status === "completed" && inProgress === 0) break;
      await sleep(1500);
    }

    const id = safeId();

    await prisma.knowledgeBase.create({
      data: {
        id,
        name: trimmedName,
        vectorStoreId: vs.id,
        visibility: "PRIVATE",
        ownerUserId: DEFAULT_OWNER_USER_ID,
      },
    });

    const agreementIdByFilename = new Map<string, string | null>();

    for (const d of preparedDocs) {
      if (!agreementIdByFilename.has(d.filename)) {
        const agreementId = isCba
          ? await getOrCreateAgreement({
              kbName: trimmedName,
              filename: d.filename,
              chapter,
              localUnion,
              cbaType,
              state,
              effectiveFrom,
              effectiveTo,
            })
          : null;

        agreementIdByFilename.set(d.filename, agreementId);
      }
    }

    for (const d of preparedDocs) {
      const agreementId = agreementIdByFilename.get(d.filename) ?? null;

      try {
        await prisma.document.create({
          data: {
            ownerUserId: DEFAULT_OWNER_USER_ID,
            kbId: id,
            agreementId,
            openaiFileId: d.openaiFileId,
            filename: d.filename,
            isCba,
            chapter,
            localUnion,
            cbaType,
            state,
            effectiveFrom,
            effectiveTo,
            sharedToCbas: isCba && shareToCbas,
            storageProvider: d.storageProvider,
            storageKey: d.storageKey,
            mimeType: d.mimeType,
            fileSizeBytes: d.fileSizeBytes,
            sha256: d.sha256,
            textContent: {
              create: {
                extractedText: d.extractedText,
                extractionState: d.extractionState,
              },
            },
          },
        });
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code?: string }).code === "P2002"
        ) {
          continue;
        }
        throw e;
      }
    }

    if (isCba && shareToCbas) {
      const allCbasKbId = "cbas_shared";

      const allCbas = await prisma.knowledgeBase.findUnique({
        where: { id: allCbasKbId },
      });

      if (!allCbas) {
        return NextResponse.json(
          { error: "System KB 'cbas_shared' not found. Run seed." },
          { status: 500 }
        );
      }

      let allCbasVsId = allCbas.vectorStoreId;
      if (!allCbasVsId || !allCbasVsId.startsWith("vs_")) {
        const newVs = await openai.vectorStores.create({
          name: `System KB: ${allCbas.name}`,
        });
        allCbasVsId = newVs.id;

        await prisma.knowledgeBase.update({
          where: { id: allCbasKbId },
          data: { vectorStoreId: allCbasVsId },
        });
      }

      const existingAllCbasDocs = await prisma.document.findMany({
        where: { kbId: allCbasKbId },
        select: { filename: true },
      });

      const dbNames = new Set(existingAllCbasDocs.map((x) => x.filename.trim()));

      let vsNames = new Set<string>();
      try {
        vsNames = await getVectorStoreAttachedFilenames(allCbasVsId);
      } catch {
        // best effort
      }

      const alreadyThere = new Set<string>([...dbNames, ...vsNames]);

      for (const d of preparedDocs) {
        if (alreadyThere.has(d.filename.trim())) continue;

        await openai.vectorStores.files.create(allCbasVsId, {
          file_id: d.openaiFileId,
        });

        const agreementId = agreementIdByFilename.get(d.filename) ?? null;

        try {
          await prisma.document.create({
            data: {
              ownerUserId: DEFAULT_OWNER_USER_ID,
              kbId: allCbasKbId,
              agreementId,
              openaiFileId: d.openaiFileId,
              filename: d.filename,
              isCba: true,
              chapter,
              localUnion,
              cbaType,
              state,
              effectiveFrom,
              effectiveTo,
              sharedToCbas: true,
              storageProvider: d.storageProvider,
              storageKey: d.storageKey,
              mimeType: d.mimeType,
              fileSizeBytes: d.fileSizeBytes,
              sha256: d.sha256,
              textContent: {
                create: {
                  extractedText: d.extractedText,
                  extractionState: d.extractionState,
                },
              },
            },
          });
        } catch (e: unknown) {
          if (
            typeof e === "object" &&
            e !== null &&
            "code" in e &&
            (e as { code?: string }).code === "P2002"
          ) {
            continue;
          }
          throw e;
        }
      }
    }

    return NextResponse.json({ id, name: trimmedName, vectorStoreId: vs.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}