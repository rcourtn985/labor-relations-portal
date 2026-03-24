import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { spawn } from "child_process";

export type ExtractionResult = {
  extractedText: string;
  extractionState: "completed" | "unsupported" | "failed";
};

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeTempName(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}_${Math.random().toString(16).slice(2)}_${base}`;
}

async function runPythonPdfExtraction(args: {
  filename: string;
  bytes: Buffer;
}): Promise<string> {
  const tempFilePath = path.join(os.tmpdir(), safeTempName(args.filename));
  const scriptPath = path.join(process.cwd(), "scripts", "extract_pdf_text.py");

  await fs.writeFile(tempFilePath, args.bytes);

  try {
    console.log(
      `[text-extraction] Starting PDF extraction for ${args.filename} (${args.bytes.length} bytes)`
    );

    const result = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number | null;
    }>((resolve, reject) => {
      const child = spawn("python3", [scriptPath, tempFilePath], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", reject);

      child.on("close", (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });
    });

    if (result.stderr.trim()) {
      console.error(
        `[text-extraction] Python stderr for ${args.filename}:`,
        result.stderr
      );
    }

    let parsed: { ok?: boolean; error?: string | null; text?: string } = {};

    try {
      parsed = JSON.parse(result.stdout || "{}");
    } catch (parseError) {
      throw new Error(
        `Failed to parse PDF extraction output. Exit code: ${result.exitCode}. Raw output: ${result.stdout}`
      );
    }

    if (!parsed.ok) {
      throw new Error(
        parsed.error ||
          `PDF extraction failed with exit code ${result.exitCode ?? "unknown"}`
      );
    }

    const extractedText = normalizeExtractedText(parsed.text || "");

    console.log(
      `[text-extraction] PDF extraction completed for ${args.filename}. Extracted ${extractedText.length} characters.`
    );

    if (extractedText.length > 0) {
      console.log(
        `[text-extraction] PDF preview for ${args.filename}:`,
        extractedText.slice(0, 300)
      );
    }

    return extractedText;
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
}

export async function extractTextFromFile(args: {
  filename: string;
  bytes: Buffer;
  mimeType?: string | null;
}): Promise<ExtractionResult> {
  const ext = path.extname(args.filename).toLowerCase();

  try {
    if (ext === ".txt") {
      const extractedText = normalizeExtractedText(args.bytes.toString("utf8"));

      console.log(
        `[text-extraction] TXT extraction completed for ${args.filename}. Extracted ${extractedText.length} characters.`
      );

      return {
        extractedText,
        extractionState: "completed",
      };
    }

    if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: args.bytes,
      });

      const extractedText = normalizeExtractedText(result.value || "");

      console.log(
        `[text-extraction] DOCX extraction completed for ${args.filename}. Extracted ${extractedText.length} characters.`
      );

      return {
        extractedText,
        extractionState: "completed",
      };
    }

    if (ext === ".pdf") {
      const extractedText = await runPythonPdfExtraction({
        filename: args.filename,
        bytes: args.bytes,
      });

      return {
        extractedText,
        extractionState: extractedText ? "completed" : "failed",
      };
    }

    console.log(
      `[text-extraction] Unsupported file type for ${args.filename}: ${ext || "(none)"}`
    );

    return {
      extractedText: "",
      extractionState: "unsupported",
    };
  } catch (error) {
    console.error(
      `[text-extraction] Failed to extract text from ${args.filename}`,
      error
    );

    return {
      extractedText: "",
      extractionState: "failed",
    };
  }
}