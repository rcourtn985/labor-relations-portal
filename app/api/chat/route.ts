import OpenAI from "openai";
import { NextResponse } from "next/server";
import { appendChatLog } from "@/lib/logger";
import { CONSTITUTION } from "@/lib/constitution";
import { retrieveAcrossAllKBs } from "@/lib/retrieveAll";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
};

type ChatScopeFilters = {
  chapters?: string[];
  localUnions?: string[];
  agreementTypes?: string[];
  states?: string[];
  includeNationalAgreements?: boolean;
};

function getLastUserQuestion(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user" && typeof messages[i]?.content === "string") {
      return messages[i].content;
    }
  }
  return "";
}

function normalizeMessagesForResponsesApi(
  messages: unknown[]
): OpenAI.Responses.ResponseInput {
  const normalized: OpenAI.Responses.ResponseInputItem[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;

    const role = (msg as any).role;
    const content = (msg as any).content;

    if (
      (role === "system" ||
        role === "developer" ||
        role === "user" ||
        role === "assistant") &&
      typeof content === "string" &&
      content.trim()
    ) {
      normalized.push({
        type: "message",
        role,
        content: [
          {
            type: "input_text",
            text: content,
          },
        ],
      });
    }
  }

  return normalized;
}

function normalizeFilters(rawFilters: unknown): Required<ChatScopeFilters> {
  const filters = (rawFilters ?? {}) as ChatScopeFilters;

  return {
    chapters: Array.isArray(filters.chapters) ? filters.chapters : [],
    localUnions: Array.isArray(filters.localUnions) ? filters.localUnions : [],
    agreementTypes: Array.isArray(filters.agreementTypes)
      ? filters.agreementTypes
      : [],
    states: Array.isArray(filters.states) ? filters.states : [],
    includeNationalAgreements: Boolean(filters.includeNationalAgreements),
  };
}

function formatFiltersForPrompt(filters: Required<ChatScopeFilters>): string {
  return [
    `Chapters: ${filters.chapters.length ? filters.chapters.join(", ") : "All"}`,
    `Local Unions: ${
      filters.localUnions.length ? filters.localUnions.join(", ") : "All"
    }`,
    `Agreement Types: ${
      filters.agreementTypes.length ? filters.agreementTypes.join(", ") : "All"
    }`,
    `States: ${filters.states.length ? filters.states.join(", ") : "All"}`,
    `Include National Agreements: ${
      filters.includeNationalAgreements ? "Yes" : "No"
    }`,
  ].join("\n");
}

export async function POST(req: Request) {
  const ts = new Date().toISOString();
  const model = "gpt-4o-mini";

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent");

  let requestMessages: ChatMessage[] = [];
  let responseText = "";
  let retrievalResults: any[] = [];

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing.");
    }

    const body = await req.json();
    requestMessages = Array.isArray(body.messages) ? body.messages : [];
    const filters = normalizeFilters(body.filters);

    const question = getLastUserQuestion(requestMessages);
    const chunks: any[] = await retrieveAcrossAllKBs(question, 12);

    if (!chunks.length) {
      responseText =
        "I could not find relevant agreement excerpts for that question. Try rephrasing the question or broadening the scope.";

      await appendChatLog({
        ts,
        model,
        ip,
        userAgent,
        requestMessages,
        responseText,
        retrievalResults: [],
      });

      return NextResponse.json({ text: responseText });
    }

    const context = chunks
      .slice(0, 12)
      .map((c, i) => {
        const kbName = c?.kbName ? String(c.kbName) : "Unknown KB";
        const fileName = c?.file_name ? String(c.file_name) : "";
        const text = c?.text ? String(c.text) : "";
        const header = `[#${i + 1}] Agreement Source: ${kbName}${
          fileName ? ` | File: ${fileName}` : ""
        }`;
        return `${header}\n${text}`;
      })
      .join("\n\n");

    const contextInstruction = `
You are answering agreement-specific questions for a labor relations portal.

Rules:
- Use the retrieved excerpts as your primary source.
- Answer the user's question directly and clearly.
- If the retrieved excerpts conflict, say so and explain the difference.
- If the answer is not clear from the excerpts, say that plainly.
- End with a short "Sources:" section listing the document/file names you relied on.
- Keep user-facing language agreement-focused, not knowledge-base-focused.
- Treat the current scope below as user intent and context, but do not refuse to answer merely because metadata is incomplete.

Current scope:
${formatFiltersForPrompt(filters)}
`;

    const input: OpenAI.Responses.ResponseInput = [
      {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: CONSTITUTION }],
      },
      {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${contextInstruction}\n\nRetrieved context:\n${context}`,
          },
        ],
      },
      ...normalizeMessagesForResponsesApi(requestMessages),
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