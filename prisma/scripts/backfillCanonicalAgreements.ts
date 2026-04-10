import { PrismaClient } from "../../lib/generated/prisma";
import { buildCanonicalAgreementKey } from "../../lib/agreements/canonical";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

const SHARED_CBAS_KB_ID = "cbas_shared";

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

async function main() {
  const documents = await prisma.document.findMany({
    where: {
      isCba: true,
      deletedAt: null,
    },
    select: {
      id: true,
      agreementId: true,
      filename: true,
      chapter: true,
      localUnion: true,
      cbaType: true,
      state: true,
      effectiveFrom: true,
      effectiveTo: true,
      kbId: true,
      createdAt: true,
      kb: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const preferredNameByCanonicalKey = new Map<string, string>();

  for (const doc of documents) {
    const canonicalKey = buildCanonicalAgreementKey({
      filename: doc.filename,
      chapter: doc.chapter,
      localUnion: doc.localUnion,
      cbaType: doc.cbaType,
      state: doc.state,
      effectiveFrom: doc.effectiveFrom,
      effectiveTo: doc.effectiveTo,
    });

    if (!canonicalKey) continue;
    if (preferredNameByCanonicalKey.has(canonicalKey)) continue;
    if (doc.kbId === SHARED_CBAS_KB_ID) continue;

    const kbName = normalizeValue(doc.kb?.name);
    if (kbName) {
      preferredNameByCanonicalKey.set(canonicalKey, kbName);
    }
  }

  for (const doc of documents) {
    const canonicalKey = buildCanonicalAgreementKey({
      filename: doc.filename,
      chapter: doc.chapter,
      localUnion: doc.localUnion,
      cbaType: doc.cbaType,
      state: doc.state,
      effectiveFrom: doc.effectiveFrom,
      effectiveTo: doc.effectiveTo,
    });

    if (!canonicalKey) continue;
    if (preferredNameByCanonicalKey.has(canonicalKey)) continue;

    const fallbackName =
      normalizeValue(doc.kb?.name) ||
      normalizeValue(doc.filename) ||
      "(untitled agreement)";

    preferredNameByCanonicalKey.set(canonicalKey, fallbackName);
  }

  const existingAgreements = await prisma.agreement.findMany({
    select: {
      id: true,
      canonicalKey: true,
    },
  });

  const agreementIdByCanonicalKey = new Map<string, string>(
    existingAgreements.map((item) => [item.canonicalKey, item.id])
  );

  let createdAgreements = 0;
  let linkedDocuments = 0;
  let skippedDocuments = 0;

  for (const doc of documents) {
    const canonicalKey = buildCanonicalAgreementKey({
      filename: doc.filename,
      chapter: doc.chapter,
      localUnion: doc.localUnion,
      cbaType: doc.cbaType,
      state: doc.state,
      effectiveFrom: doc.effectiveFrom,
      effectiveTo: doc.effectiveTo,
    });

    if (!canonicalKey) {
      skippedDocuments += 1;
      continue;
    }

    let resolvedAgreementId = agreementIdByCanonicalKey.get(canonicalKey);

    if (!resolvedAgreementId) {
      const createdAgreement = await prisma.agreement.create({
        data: {
          name:
            preferredNameByCanonicalKey.get(canonicalKey) ??
            normalizeValue(doc.filename) ??
            "(untitled agreement)",
          canonicalKey,
          sourceFilename: normalizeValue(doc.filename) || null,
          chapter: normalizeValue(doc.chapter) || null,
          localUnion: normalizeValue(doc.localUnion) || null,
          cbaType: normalizeValue(doc.cbaType) || null,
          state: normalizeValue(doc.state) || null,
          effectiveFrom: doc.effectiveFrom,
          effectiveTo: doc.effectiveTo,
        },
        select: {
          id: true,
        },
      });

      resolvedAgreementId = createdAgreement.id;
      agreementIdByCanonicalKey.set(canonicalKey, resolvedAgreementId);
      createdAgreements += 1;
    }

    if (doc.agreementId === resolvedAgreementId) {
      skippedDocuments += 1;
      continue;
    }

    await prisma.document.update({
      where: {
        id: doc.id,
      },
      data: {
        agreementId: resolvedAgreementId,
      },
    });

    linkedDocuments += 1;
  }

  console.log(
    JSON.stringify(
      {
        documentsSeen: documents.length,
        agreementsCreated: createdAgreements,
        documentsLinked: linkedDocuments,
        documentsSkipped: skippedDocuments,
      },
      null,
      2
    )
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });