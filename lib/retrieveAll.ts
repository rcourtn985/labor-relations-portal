import OpenAI from "openai";
import { readKBIndex } from "@/lib/kbIndex";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RetrievedChunk = {
  kbId: string;
  kbName: string;
  file_name?: string;
  text?: string;
  score?: number;
  raw?: any;
};

function extractResults(resp: any): any[] {
  return (
    resp?.file_search_call?.results ??
    resp?.output?.flatMap((o: any) =>
      o?.type === "file_search_call" && Array.isArray(o.results) ? o.results : []
    ) ??
    []
  );
}

export async function retrieveAcrossAllKBs(query: string, perKb: number = 3) {
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
  ].filter(
    (kb) =>
      typeof kb.vectorStoreId === "string" && kb.vectorStoreId.trim().length > 0
  );

  const perKbResponses = await Promise.all(
    kbList.map(async (kb) => {
      try {
        const resp = await client.responses.create({
          model: "gpt-4o-mini",
          input: [{ role: "user", content: query }],
          tools: [
            {
              type: "file_search",
              vector_store_ids: [kb.vectorStoreId.trim()],
              max_num_results: perKb,
            },
          ],
          include: ["file_search_call.results"],
        });

        const results = extractResults(resp);

        const chunks: RetrievedChunk[] = results.map((r: any) => ({
          kbId: kb.id,
          kbName: kb.name,
          file_name: r?.file_name,
          text: r?.text,
          score: r?.score,
          raw: r,
        }));

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
    const key = (c.text ?? "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  return deduped.slice(0, 12);
}