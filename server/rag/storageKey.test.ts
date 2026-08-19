import { describe, expect, it } from "vitest";
import { createAsciiStorageKey, getSupportedExtension } from "./storageKey";

describe("secure RAG storage keys", () => {
  it("keeps a Korean display filename out of the S3 key", () => {
    const key = createAsciiStorageKey(7, "2025년 1분기 시장리스크 관리 보고서.pdf", 1700000000000, "fixed-nonce");
    expect(key).toMatch(/^secure-rag\/7\/1700000000000-[a-f0-9]{20}\.pdf$/);
    expect(key).toMatch(/^[\x20-\x7E]+$/);
    expect(key).not.toContain("시장리스크");
  });

  it("rejects an unsupported extension before storage", () => {
    expect(() => getSupportedExtension("internal-data.exe")).toThrow("PDF, DOCX, XLSX, PPTX");
  });
});
