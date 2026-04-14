import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SHARED_CBAS_KB_ID = "cbas_shared";

async function resolveDocumentForAgreementText(id: string) {
  const directDocument = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      textContent: {
        select: {
          extractedText: true,
          extractionState: true,
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
      documents: {
        where: {
          deletedAt: null,
          isCba: true,
        },
        select: {
          id: true,
          kbId: true,
          createdAt: true,
          textContent: {
            select: {
              extractedText: true,
              extractionState: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agreement || agreement.documents.length === 0) {
    return null;
  }

  return [...agreement.documents].sort((a, b) => {
    const aIsNational = a.kbId === SHARED_CBAS_KB_ID;
    const bIsNational = b.kbId === SHARED_CBAS_KB_ID;

    if (aIsNational !== bIsNational) {
      return aIsNational ? 1 : -1;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const doc = await resolveDocumentForAgreementText(id);

    if (!doc) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    return NextResponse.json({
      extractedText: doc.textContent?.extractedText ?? null,
      extractionState: doc.textContent?.extractionState ?? "missing",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}