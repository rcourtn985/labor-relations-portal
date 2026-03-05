import OpenAI from "openai";
import { NextResponse } from "next/server";
import { appendChatLog } from "@/lib/logger";
import { CONSTITUTION } from "@/lib/constitution";
import { resolveVectorStoreId } from "@/lib/kbIndex";
import { retrieveAcrossAllKBs } from "@/lib/retrieveAll";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractFileSearchResults(response: any): any[] {
  // Preferred shape when include: ["file_search_call.results"] works
  if (response?.file_search_call?.results) {
    return response.file_search_call.results;
  }

  // Fallback: scan output array for file_search_call objects
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

function getLastUserQuestion(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user" && typeof messages[i]?.content === "string") {
      return messages[i].content;
    }
  }
  return "";
}

export async function POST(req: Request) {
  const ts = new Date().toISOString();
  const model = "gpt-4o-mini";

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent");

  let requestMessages: any[] = [];
  let responseText = "";
  let retrievalResults: any[] = [];

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing.");
    }

    const body = await req.json();
    requestMessages = body.messages ?? [];
    const kbId = body.kbId as string | undefined;

    // -------------------------
    // ALL-KBs MODE
    // -------------------------
    if (kbId === "__all__") {
      const question = getLastUserQuestion(requestMessages);

      // Pull top results from Central + all user KBs
      const chunks: any[] = await retrieveAcrossAllKBs(question, 3);

      // Build a context pack for the model
      const context = chunks
        .slice(0, 12)
        .map((c, i) => {
          const kbName = c?.kbName ? String(c.kbName) : "Unknown KB";
          const fileName = c?.file_name ? String(c.file_name) : "";
          const text = c?.text ? String(c.text) : "";
          const header = `[#${i + 1}] KB: ${kbName}${fileName ? ` | File: ${fileName}` : ""}`;
          return `${header}\n${text}`;
        })
        .join("\n\n");

      const contextInstruction = `
You have retrieved excerpts from MULTIPLE knowledge bases (Central + user KBs).
Rules:
- Prefer the retrieved excerpts when answering.
- If sources conflict, say so and explain the difference.
- Add a short "Sources:" section listing the KB name and document/file name(s) you relied on.
`;

      const input = [
        { role: "system", content: CONSTITUTION },
        { role: "system", content: contextInstruction + `\n\nRetrieved context:\n${context}` },
        ...requestMessages,
      ];

      const response = await client.responses.create({
        model,
        input,
      });

      responseText = response.output_text ?? "";
      retrievalResults = chunks.map((c) => c?.raw ?? c);

      await appendChatLog({
        ts,
        model,
        ip,
        userAgent,
        requestMessages,
        responseText,
        retrievalResults,
      });

      return NextResponse.json({ text: responseText });
    }

    // -------------------------
    // SINGLE-KB MODE (default)
    // -------------------------
    const vectorStoreId = await resolveVectorStoreId(kbId);

    const input = [{ role: "system", content: CONSTITUTION }, ...requestMessages];

    const response = await client.responses.create({
      model,
      input,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: 6,
        },
      ],
      include: ["file_search_call.results"],
    });

    responseText = response.output_text ?? "";
    retrievalResults = extractFileSearchResults(response);

    await appendChatLog({
      ts,
      model,
      ip,
      userAgent,
      requestMessages,
      responseText,
      retrievalResults,
    });

    return NextResponse.json({ text: responseText });
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