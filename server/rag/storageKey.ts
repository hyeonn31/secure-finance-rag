import { createHash, randomUUID } from "node:crypto";

const SUPPORTED_EXTENSIONS = new Set(["pdf", "docx", "xlsx", "pptx"]);

export function getSupportedExtension(fileName: string): string {
  const extension = fileName.trim().split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("PDF, DOCX, XLSX, PPTX 형식만 지원합니다.");
  }
  return extension;
}

/**
 * The original display name stays in the database. The storage path deliberately
 * contains no source filename, Korean characters, whitespace, or PII.
 */
export function createAsciiStorageKey(ownerId: number, fileName: string, now = Date.now(), nonce = randomUUID()): string {
  const extension = getSupportedExtension(fileName);
  const opaque = createHash("sha256").update(`${ownerId}\u0000${fileName}\u0000${nonce}`).digest("hex").slice(0, 20);
  const key = `secure-rag/${ownerId}/${now}-${opaque}.${extension}`;
  if (!/^[\x20-\x7E]+$/.test(key)) throw new Error("Storage key must be ASCII.");
  return key;
}
