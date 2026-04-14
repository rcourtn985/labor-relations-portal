import { NextResponse } from "next/server";
import { requireAuth, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SHARED_CBAS_KB_ID = "cbas_shared";

type SharedCopyMismatch = {
  agreementId: string;
  agreementName: string;
  filename: string;
  chapterCopyCount: number;
  sharedCopyCount: number;
};

export async function GET() {
  try {
    const session = await requireAuth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isSystemAdmin(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const [cbaDocumentCount, agreementCount, orphanDocuments, agreements] =
      await Promise.all([
        prisma.document.count({
          where: {
            isCba: true,
            deletedAt: null,
          },
        }),
        prisma.agreement.count({
          where: {
            deletedAt: null,
          },
        }),
        prisma.document.findMany({
          where: {
            isCba: true,
            deletedAt: null,
            agreementId: null,
          },
          select: {
            id: true,
            filename: true,
            chapter: true,
            localUnion: true,
            cbaType: true,
            state: true,
            kbId: true,
            createdAt: true,
            sharedToCbas: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.agreement.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            sourceFilename: true,
            documents: {
              where: {
                deletedAt: null,
                isCba: true,
              },
              select: {
                id: true,
                kbId: true,
                filename: true,
                chapter: true,
                localUnion: true,
                cbaType: true,
                state: true,
                sharedToCbas: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
      ]);

    const agreementsWithNoDocuments = agreements
      .filter((agreement) => agreement.documents.length === 0)
      .map((agreement) => ({
        agreementId: agreement.id,
        agreementName: agreement.name,
        sourceFilename: agreement.sourceFilename ?? "",
      }));

    const agreementsWithMultipleDocuments = agreements
      .filter((agreement) => agreement.documents.length > 1)
      .map((agreement) => ({
        agreementId: agreement.id,
        agreementName: agreement.name,
        documentCount: agreement.documents.length,
        filenames: [...new Set(agreement.documents.map((doc) => doc.filename).filter(Boolean))],
      }));

    const sharedCopyMismatches: SharedCopyMismatch[] = agreements
      .map((agreement) => {
        const sharedDocs = agreement.documents.filter(
          (doc) => doc.kbId === SHARED_CBAS_KB_ID
        );
        const chapterDocs = agreement.documents.filter(
          (doc) => doc.kbId !== SHARED_CBAS_KB_ID
        );

        if (sharedDocs.length === 0 && chapterDocs.length === 0) {
          return null;
        }

        if (sharedDocs.length === 1 && chapterDocs.length >= 1) {
          return null;
        }

        if (sharedDocs.length === 0 && chapterDocs.length === 1) {
          return {
            agreementId: agreement.id,
            agreementName: agreement.name,
            filename:
              chapterDocs[0]?.filename ??
              sharedDocs[0]?.filename ??
              agreement.sourceFilename ??
              "",
            chapterCopyCount: chapterDocs.length,
            sharedCopyCount: sharedDocs.length,
          };
        }

        if (sharedDocs.length !== 1 || chapterDocs.length !== 1) {
          return {
            agreementId: agreement.id,
            agreementName: agreement.name,
            filename:
              chapterDocs[0]?.filename ??
              sharedDocs[0]?.filename ??
              agreement.sourceFilename ??
              "",
            chapterCopyCount: chapterDocs.length,
            sharedCopyCount: sharedDocs.length,
          };
        }

        return null;
      })
      .filter((item): item is SharedCopyMismatch => item !== null);

    const mixedMetadataAgreements = agreements
      .map((agreement) => {
        const chapterValues = [...new Set(agreement.documents.map((doc) => (doc.chapter ?? "").trim()).filter(Boolean))];
        const localUnionValues = [...new Set(agreement.documents.map((doc) => (doc.localUnion ?? "").trim()).filter(Boolean))];
        const agreementTypeValues = [...new Set(agreement.documents.map((doc) => (doc.cbaType ?? "").trim()).filter(Boolean))];
        const stateValues = [...new Set(agreement.documents.map((doc) => (doc.state ?? "").trim()).filter(Boolean))];

        const hasMismatch =
          chapterValues.length > 1 ||
          localUnionValues.length > 1 ||
          agreementTypeValues.length > 1 ||
          stateValues.length > 1;

        if (!hasMismatch) {
          return null;
        }

        return {
          agreementId: agreement.id,
          agreementName: agreement.name,
          chapterValues,
          localUnionValues,
          agreementTypeValues,
          stateValues,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      summary: {
        cbaDocumentCount,
        agreementCount,
        orphanCbaDocumentCount: orphanDocuments.length,
        agreementsWithNoDocumentsCount: agreementsWithNoDocuments.length,
        agreementsWithMultipleDocumentsCount: agreementsWithMultipleDocuments.length,
        sharedCopyMismatchCount: sharedCopyMismatches.length,
        mixedMetadataAgreementCount: mixedMetadataAgreements.length,
      },
      orphans: orphanDocuments,
      agreementsWithNoDocuments,
      agreementsWithMultipleDocuments,
      sharedCopyMismatches,
      mixedMetadataAgreements,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}