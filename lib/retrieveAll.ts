import OpenAI from "openai";
import { readKBIndex } from "@/lib/kbIndex";
import { prisma } from "@/lib/prisma";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type RetrievedChunk = {
  kbId: string;
  kbName: string;
  file_name?: string;
  text?: string;
  score?: number;
  chapter?: string | null;
  localUnion?: string | null;
  agreementType?: string | null;
  state?: string | null;
  isCba?: boolean;
  sharedToCbas?: boolean;
  raw?: any;
};

type RetrieveAcrossAllKBsOptions = {
  perKb?: number;
  includeNationalDatabase?: boolean;
};

const SHARED_CBAS_KB_ID = "cbas_shared";

function extractResults(resp: any): any[] {
  return (
    resp?.file_search_call?.results ??
    resp?.output?.flatMap((o: any) =>
      o?.type === "file_search_call" && Array.isArray(o.results) ? o.results : []
    ) ??
    []
  );
}

function normalizeFilename(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function retrieveAcrossAllKBs(
  query: string,
  options: number | RetrieveAcrossAllKBsOptions = 3
) {
  const resolvedOptions =
    typeof options === "number"
      ? { perKb: options, includeNationalDatabase: false }
      : {
          perKb: options.perKb ?? 3,
          includeNationalDatabase: Boolean(options.includeNationalDatabase),
        };

  const index = await readKBIndex();

  const kbList = [
    {
      id: index.central.id,
      name: index.central.name,
      vectorStoreId: index.central.vectorStoreId,
    },
    ...(index.userKbs ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      vectorStoreId: k.vectorStoreId,
    })),
  ];

  if (resolvedOptions.includeNationalDatabase) {
    const sharedKb = await prisma.knowledgeBase.findUnique({
      where: { id: SHARED_CBAS_KB_ID },
      select: {
        id: true,
        name: true,
        vectorStoreId: true,
      },
    });

    if (sharedKb) {
      kbList.push({
        id: sharedKb.id,
        name: sharedKb.name,
        vectorStoreId: sharedKb.vectorStoreId,
      });
    }
  }

  const searchableKbList = kbList
    .filter(
      (kb) =>
        typeof kb.vectorStoreId === "string" && kb.vectorStoreId.trim().length > 0
    )
    .filter((kb, index, arr) => arr.findIndex((x) => x.id === kb.id) === index);

  const kbIds = searchableKbList.map((kb) => kb.id);

  const docs = await prisma.document.findMany({
    where: {
      kbId: { in: kbIds },
    },
    select: {
      kbId: true,
      filename: true,
      chapter: true,
      localUnion: true,
      cbaType: true,
      state: true,
      isCba: true,
      sharedToCbas: true,
    },
  });

  const docByKbAndFilename = new Map<
    string,
    {
      chapter: string | null;
      localUnion: string | null;
      cbaType: string | null;
      state: string | null;
      isCba: boolean;
      sharedToCbas: boolean;
    }
  >();

  for (const doc of docs) {
    const key = `${doc.kbId}::${normalizeFilename(doc.filename)}`;
    docByKbAndFilename.set(key, {
      chapter: doc.chapter,
      localUnion: doc.localUnion,
      cbaType: doc.cbaType,
      state: doc.state,
      isCba: doc.isCba,
      sharedToCbas: doc.sharedToCbas,
    });
  }

  const perKbResponses = await Promise.all(
    searchableKbList.map(async (kb) => {
      try {
        const resp = await client.responses.create({
          model: "gpt-4o-mini",
          input: [{ role: "user", content: query }],
          tools: [
            {
              type: "file_search",
              vector_store_ids: [kb.vectorStoreId.trim()],
              max_num_results: resolvedOptions.perKb,
            },
          ],
          include: ["file_search_call.results"],
        });

        const results = extractResults(resp);

        const chunks: RetrievedChunk[] = results.map((r: any) => {
          const fileName =
            r?.file_name ?? r?.filename ?? r?.document_name ?? undefined;
          const metadata =
            docByKbAndFilename.get(
              `${kb.id}::${normalizeFilename(fileName)}`
            ) ?? null;

          return {
            kbId: kb.id,
            kbName: kb.name,
            file_name: fileName,
            text: r?.text,
            score: r?.score,
            chapter: metadata?.chapter ?? null,
            localUnion: metadata?.localUnion ?? null,
            agreementType: metadata?.cbaType ?? null,
            state: metadata?.state ?? null,
            isCba: metadata?.isCba ?? false,
            sharedToCbas: metadata?.sharedToCbas ?? false,
            raw: r,
          };
        });

        return chunks;
      } catch (error) {
        console.error(
          `retrieveAcrossAllKBs failed for KB ${kb.name} (${kb.id})`,
          error
        );
        return [];
      }
    })
  );

  const all: RetrievedChunk[] = perKbResponses.flat();

  all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];
  for (const c of all) {
    const key = `${c.kbId}::${(c.text ?? "").trim()}`;
    if (!c.text?.trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  return deduped.slice(0, 12);
}