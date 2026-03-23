import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FilterOption = {
  value: string;
  label: string;
};

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

function toOptionArray(values: Iterable<string>): FilterOption[] {
  return [...new Set(values)]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: value,
    }));
}

function parseStates(rawState: string | null | undefined): string[] {
  const value = normalizeValue(rawState);
  if (!value) return [];

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const selectedChapters = request.nextUrl.searchParams
      .getAll("chapters")
      .map((value) => value.trim())
      .filter(Boolean);

    const allChapterRows = await prisma.document.findMany({
      where: {
        isCba: true,
        chapter: {
          not: null,
        },
      },
      select: {
        chapter: true,
      },
    });

    const filteredRows = await prisma.document.findMany({
      where: {
        isCba: true,
        ...(selectedChapters.length > 0
          ? {
              chapter: {
                in: selectedChapters,
              },
            }
          : {}),
      },
      select: {
        localUnion: true,
        cbaType: true,
        state: true,
      },
    });

    const chapterOptions = toOptionArray(
      allChapterRows.map((row) => normalizeValue(row.chapter)).filter(Boolean)
    );

    const localUnionOptions = toOptionArray(
      filteredRows.map((row) => normalizeValue(row.localUnion)).filter(Boolean)
    );

    const agreementTypeOptions = toOptionArray(
      filteredRows.map((row) => normalizeValue(row.cbaType)).filter(Boolean)
    );

    const stateOptions = toOptionArray(
      filteredRows.flatMap((row) => parseStates(row.state))
    );

    return NextResponse.json({
      chapterOptions,
      localUnionOptions,
      agreementTypeOptions,
      stateOptions,
    });
  } catch (error) {
    console.error("Failed to load filter options:", error);

    return NextResponse.json(
      {
        error: "Failed to load filter options.",
        chapterOptions: [],
        localUnionOptions: [],
        agreementTypeOptions: [],
        stateOptions: [],
      },
      { status: 500 }
    );
  }
}