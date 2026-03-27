import { NextResponse } from "next/server";
import OpenAI from "openai";
import { extractTextFromFile } from "@/lib/text-extraction";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a metadata extraction assistant for collective bargaining agreements (CBAs). Given the text of a CBA, extract the following fields and return them as a JSON object. Use null for any field you cannot determine with reasonable confidence.

Fields:
- agreementName: The full name or title of the agreement (e.g., "IBEW Local 702 Collective Bargaining Agreement")
- chapter: The chapter number or name (e.g., "Chapter 12", "Southern Chapter")
- localUnion: Local union number(s), comma-separated if multiple (e.g., "702" or "702, 461")
- agreementType: Type of agreement (e.g., "Collective Bargaining Agreement", "Memorandum of Understanding", "Letter of Agreement")
- states: US state abbreviation(s) where the agreement applies, comma-separated (e.g., "LA" or "LA, MS")
- effectiveFrom: Agreement start or effective date in YYYY-MM-DD format
- effectiveTo: Agreement end or expiration date in YYYY-MM-DD format

Return only the JSON object with these exact keys. Do not include any explanation or extra text.`;

function safeStr(val: unknown): string | null {
  if (typeof val === "string" && val.trim()) return val.trim();
  return null;
}

function safeDate(val: unknown): string | null {
  if (typeof val !== "string" || !val.trim()) return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const extracted = await extractTextFromFile({
      filename: file.name,
      bytes,
      mimeType: file.type || null,
    });

    const text = extracted.extractedText?.trim() ?? "";

    const empty = {
      agreementName: null,
      chapter: null,
      localUnion: null,
      agreementType: null,
      states: null,
      effectiveFrom: null,
      effectiveTo: null,
    };

    if (!text) return NextResponse.json(empty);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract metadata from this collective bargaining agreement:\n\n${text.slice(0, 3000)}`,
        },
      ],
    });

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    } catch {
      // return empty if parsing fails
    }

    return NextResponse.json({
      agreementName: safeStr(parsed.agreementName),
      chapter: safeStr(parsed.chapter),
      localUnion: safeStr(parsed.localUnion),
      agreementType: safeStr(parsed.agreementType),
      states: safeStr(parsed.states),
      effectiveFrom: safeDate(parsed.effectiveFrom),
      effectiveTo: safeDate(parsed.effectiveTo),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
