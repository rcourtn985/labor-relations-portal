import path from "path";
import { promises as fs } from "fs";
import { createHash } from "crypto";

export type StoredFileResult = {
  provider: "local";
  storageKey: string;
  mimeType: string | null;
  fileSizeBytes: number;
  sha256: string;
};

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), "storage", "originals");

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function storeOriginalFile(args: {
  filename: string;
  bytes: Buffer;
  mimeType?: string | null;
}): Promise<StoredFileResult> {
  const safeFilename = sanitizePathPart(args.filename);
  const timestamp = Date.now();
  const randomPart = Math.random().toString(16).slice(2);
  const storageKey = path.join(`${timestamp}_${randomPart}`, safeFilename);

  const fullPath = path.join(LOCAL_STORAGE_ROOT, storageKey);
  const dir = path.dirname(fullPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, args.bytes);

  const sha256 = createHash("sha256").update(args.bytes).digest("hex");

  return {
    provider: "local",
    storageKey: storageKey.replace(/\\/g, "/"),
    mimeType: args.mimeType ?? null,
    fileSizeBytes: args.bytes.byteLength,
    sha256,
  };
}

export function getLocalStoredFilePath(storageKey: string): string {
  return path.join(LOCAL_STORAGE_ROOT, storageKey);
}