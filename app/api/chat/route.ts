import OpenAI from "openai";
import { NextResponse } from "next/server";
import { appendChatLog } from "@/lib/logger";
import { CONSTITUTION } from "@/lib/constitution";
import { prisma } from "@/lib/prisma";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Msg = {
  role: "user" | "assistant";
  content: string;
};

type ChatScopeFilters = {
  chapters?: string[];
  localUnions?: string[];
  agreementTypes?: string[];
  states?: string[];
  includeNationalAgreements?: boolean;
};

type ScopedKb = {
  kbId: string;
  kbName: string;
  vectorStoreId: string;
  allowedFilenames: Set<string>;
};

type RetrievedChunk = {
  kbId: string;
  kbName: string;
  file_name?: string;
  text?: string;
  score?: number;
  raw?: any;
};

function normalizeArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function parseStates(rawState: string | null | undefined): string[] {
  const value = (rawState ?? "").trim();
  if (!value) return [];

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function documentMatchesStates(
  rawState: string | null | undefined,
  selectedStates: string[]
): boolean {
  if (selectedStates.length === 0) return true;

  const docStates = parseStates(rawState);
  if (docStates.length === 0) return false;

  return docStates.some((state) => selectedStates.includes(state));
}

function normalizeFilename(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function extractFileSearchResults(response: any): any[] {
  if (response?.file_search_call?.results) {
    return response.file_search_call.results;
  }

  const out = response?.output;
  if (Array.isArray(out)) {
    const results: any[] = [];

    for (const item of out) {
      if (item?.type === "file_search_call" && Array.isArray(item?.results)) {
        results.push(...item.results);
      }

      if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (c?.type === "file_search_call" && Array.isArray(c?.results)) {
            results.push(...c.results);
          }
        }
      }
    }

    return results;
  }

  return [];
}

function getLastUserQuestion(messages: Msg[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user" && typeof messages[i]?.content === "string") {
      return messages[i].content;
    }
  }

  return "";
}

function formatFilterSummary(filters: ChatScopeFilters): string {
  const parts: string[] = [];

  if (filters.chapters?.length) {
    parts.push(`Chapter: ${filters.chapters.join(", ")}`);
  }

  if (filters.localUnions?.length) {
    parts.push(`Local Union: ${filters.localUnions.join(", ")}`);
  }

  if (filters.agreementTypes?.length) {
    parts.push(`Agreement Type: ${filters.agreementTypes.join(", ")}`);
  }

  if (filters.states?.length) {
    parts.push(`State(s): ${filters.states.join(", ")}`);
  }

  parts.push(
    `National Agreements: ${filters.includeNationalAgreements ? "Included" : "Excluded"}`
  );

  return parts.join(" | ");
}

async function retrieveAcrossScopedKbs(
  query: string,
  scopedKbs: ScopedKb[],
  perKb: number = 6
): Promise<RetrievedChunk[]> {
  const perKbResponses = await Promise.all(
    scopedKbs.map(async (kb) => {
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: [{ role: "user", content: query }],
        tools: [
          {
            type: "file_search",
            vector_store_ids: [kb.vectorStoreId],
            max_num_results: perKb,
          },
        ],
        include: ["file_search_call.results"],
      });

      const results = extractFileSearchResults(response);

      const allowedNormalized = new Set(
        [...kb.allowedFilenames].map((name) => normalizeFilename(name))
      );

      const exactFilenameMatches = results.filter((result: any) => {
        const fileName = normalizeFilename(result?.file_name);
        if (!fileName) return false;
        return allowedNormalized.has(fileName);
      });

      const usableResults =
        exactFilenameMatches.length > 0
          ? exactFilenameMatches
          : results;

      const chunks: RetrievedChunk[] = usableResults
        .filter((result: any) => String(result?.text ?? "").trim())
        .map((result: any) => ({
          kbId: kb.kbId,
          kbName: kb.kbName,
          file_name: result?.file_name,
          text: result?.text,
          score: result?.score,
          raw: result,
        }));

      return chunks;
    })
  );

  const all = perKbResponses.flat();

  all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];

  for (const chunk of all) {
    const key = `${chunk.kbId}::${chunk.file_name ?? ""}::${(chunk.text ?? "").trim()}`;
    if (!chunk.text?.trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(chunk);
  }

  return deduped.slice(0, 14);
}

export async function POST(req: Request) {
  const ts = new Date().toISOString();
  const model = "gpt-4o-mini";

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent");

  let requestMessages: Msg[] = [];
  let responseText = "";
  let retrievalResults: any[] = [];

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing.");
    }

    const body = await req.json();
    requestMessages = (body.messages ?? []) as Msg[];

    const rawFilters = (body.filters ?? {}) as ChatScopeFilters;

    const filters: ChatScopeFilters = {
      chapters: normalizeArray(rawFilters.chapters),
      localUnions: normalizeArray(rawFilters.localUnions),
      agreementTypes: normalizeArray(rawFilters.agreementTypes),
      states: normalizeArray(rawFilters.states),
      includeNationalAgreements: normalizeBoolean(rawFilters.includeNationalAgreements),
    };

    const question = getLastUserQuestion(requestMessages);

    if (!question.trim()) {
      throw new Error("No user question was provided.");
    }

    const candidateDocuments = await prisma.document.findMany({
      where: {
        isCba: true,
        ...(filters.chapters?.length
          ? {
              chapter: {
                in: filters.chapters,
              },
            }
          : {}),
        ...(filters.localUnions?.length
          ? {
              localUnion: {
                in: filters.localUnions,
              },
            }
          : {}),
        ...(filters.agreementTypes?.length
          ? {
              cbaType: {
                in: filters.agreementTypes,
              },
            }
          : {}),
      },
      select: {
        id: true,
        filename: true,
        chapter: true,
        cbaType: true,
        state: true,
        localUnion: true,
        kb: {
          select: {
            id: true,
            name: true,
            vectorStoreId: true,
            visibility: true,
          },
        },
      },
    });

    const scopedDocuments = candidateDocuments.filter((doc) => {
      if (!filters.includeNationalAgreements && doc.kb.visibility === "SYSTEM") {
        return false;
      }

      if (!documentMatchesStates(doc.state, filters.states ?? [])) {
        return false;
      }

      return true;
    });

    if (scopedDocuments.length === 0) {
      responseText =
        "I could not find any agreements matching the current filters. Try clearing one or more filters, or upload/tag additional agreements so they have CBA metadata.";

      await appendChatLog({
        ts,
        model,
        ip,
        userAgent,
        requestMessages,
        responseText,
        retrievalResults,
      });

      return NextResponse.json({
        text: responseText,
        debug: {
          scopedMode: "cba-filtered",
          filtersApplied: filters,
          matchedDocuments: 0,
          matchedKnowledgeBases: 0,
        },
      });
    }

    const kbMap = new Map<string, ScopedKb>();

    for (const doc of scopedDocuments) {
      if (!doc.kb?.vectorStoreId) {
        continue;
      }

      const existing = kbMap.get(doc.kb.id);

      if (existing) {
        existing.allowedFilenames.add(doc.filename);
        continue;
      }

      kbMap.set(doc.kb.id, {
        kbId: doc.kb.id,
        kbName: doc.kb.name,
        vectorStoreId: doc.kb.vectorStoreId,
        allowedFilenames: new Set([doc.filename]),
      });
    }

    const scopedKbs = [...kbMap.values()];

    if (scopedKbs.length === 0) {
      responseText =
        "The matching agreements do not currently have searchable vector stores attached. Please check the upload/indexing flow for those agreements.";

      await appendChatLog({
        ts,
        model,
        ip,
        userAgent,
        requestMessages,
        responseText,
        retrievalResults,
      });

      return NextResponse.json({
        text: responseText,
        debug: {
          scopedMode: "cba-filtered",
          filtersApplied: filters,
          matchedDocuments: scopedDocuments.length,
          matchedKnowledgeBases: 0,
        },
      });
    }

    const chunks = await retrieveAcrossScopedKbs(question, scopedKbs, 6);

    if (chunks.length === 0) {
      const docNames = scopedDocuments
        .map((doc) => doc.filename)
        .filter(Boolean)
        .slice(0, 8)
        .join(", ");

      responseText =
        "I found agreements that match the current filters, but I could not retrieve useful searchable excerpts for this question. Try rephrasing the question with more exact contract language, or broadening the filters." +
        (docNames ? ` Matching documents included: ${docNames}.` : "");

      await appendChatLog({
        ts,
        model,
        ip,
        userAgent,
        requestMessages,
        responseText,
        retrievalResults,
      });

      return NextResponse.json({
        text: responseText,
        debug: {
          scopedMode: "cba-filtered",
          filtersApplied: filters,
          matchedDocuments: scopedDocuments.length,
          matchedKnowledgeBases: scopedKbs.length,
          retrievedChunks: 0,
        },
      });
    }

    const context = chunks
      .slice(0, 14)
      .map((chunk, index) => {
        const kbName = chunk.kbName ? String(chunk.kbName) : "Unknown KB";
        const fileName = chunk.file_name ? String(chunk.file_name) : "";
        const text = chunk.text ? String(chunk.text) : "";
        const header = `[#${index + 1}] KB: ${kbName}${fileName ? ` | File: ${fileName}` : ""}`;
        return `${header}\n${text}`;
      })
      .join("\n\n");

    const uniqueSources = Array.from(
      new Set(
        chunks.map((chunk) =>
          `${chunk.kbName}${chunk.file_name ? ` — ${chunk.file_name}` : ""}`
        )
      )
    );

    const filterSummary = formatFilterSummary(filters);

    const contextInstruction = `
You are answering questions about collective bargaining agreements.

The user selected filters that scope which agreements may be used.
Only rely on the retrieved excerpts provided below.

Rules:
- Prefer the retrieved excerpts when answering.
- If the excerpts are incomplete or ambiguous, say so.
- Do not claim you reviewed agreements outside the filtered scope.
- Add a short "Sources:" section listing the KB name and document/file name(s) you relied on.
- Current filter scope: ${filterSummary}
`;

    const input = [
      { role: "system", content: CONSTITUTION },
      { role: "system", content: `${contextInstruction}\n\nRetrieved context:\n${context}` },
      ...requestMessages,
    ];

    const response = await client.responses.create({
      model,
      input,
    });

    responseText = response.output_text ?? "";

    if (uniqueSources.length > 0 && !responseText.includes("Sources:")) {
      responseText += `\n\nSources:\n- ${uniqueSources.join("\n- ")}`;
    }

    retrievalResults = chunks.map((chunk) => chunk.raw ?? chunk);

    await appendChatLog({
      ts,
      model,
      ip,
      userAgent,
      requestMessages,
      responseText,
      retrievalResults,
    });

    return NextResponse.json({
      text: responseText,
      debug: {
        scopedMode: "cba-filtered",
        filtersApplied: filters,
        matchedDocuments: scopedDocuments.length,
        matchedKnowledgeBases: scopedKbs.length,
        retrievedChunks: chunks.length,
      },
    });
  } catch (e: any) {
    const errorMsg = e?.message ?? "Server error";

    await appendChatLog({
      ts,
      model,
      ip,
      userAgent,
      requestMessages,
      responseText,
      retrievalResults,
      error: errorMsg,
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}