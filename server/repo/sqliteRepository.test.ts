import Database from "better-sqlite3";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { afterEach, describe, expect, it } from "vitest";
import { ragChunks, ragDemoStates, ragDocuments } from "../../drizzle/schema";
import type { NewDocument } from "./documentRepository";
import { BOOTSTRAP_SQL, openSqliteRepository } from "./sqliteRepository";

function sampleDocument(overrides: Partial<NewDocument> = {}): NewDocument {
  return {
    ownerId: 1,
    fileName: "시장리스크 보고서.pdf",
    fileType: "pdf",
    storageKey: "secure-rag/1/1-abc.pdf",
    extractedCharacters: 120,
    parsingScore: 92,
    parsingDurationMs: 10,
    embeddingScore: 88,
    embeddingCoverage: 100,
    embeddingDurationMs: 5,
    chunks: [
      { content: "한도 초과 시 즉시 보고한다.", charStart: 0, charEnd: 15, embedding: [0.1, 0.2] },
      { content: "리스크관리위원회에 상정한다.", charStart: 15, charEnd: 30, embedding: [0.3, 0.4] },
    ],
    ...overrides,
  };
}

describe("sqlite repository", () => {
  const opened: Array<{ close(): void }> = [];
  const open = () => {
    const repo = openSqliteRepository(":memory:");
    opened.push(repo);
    return repo;
  };

  afterEach(() => {
    opened.splice(0).forEach((repo) => repo.close());
  });

  it("bootstrap SQL matches the drizzle schema columns", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(BOOTSTRAP_SQL);
    for (const table of [ragDocuments, ragChunks, ragDemoStates]) {
      const config = getTableConfig(table);
      const expected = config.columns.map((column) => column.name).sort();
      const actual = (sqlite.prepare(`PRAGMA table_info("${config.name}")`).all() as Array<{ name: string }>).map((row) => row.name).sort();
      expect(actual, config.name).toEqual(expected);
    }
    sqlite.close();
  });

  it("stores a document with its chunks and returns them for search", async () => {
    const repo = open();
    const id = await repo.createDocument(sampleDocument());

    const documents = await repo.listDocuments();
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({ id, fileName: "시장리스크 보고서.pdf", status: "ready", chunkCount: 2 });
    expect(documents[0].updatedAt).toBeInstanceOf(Date);

    const chunks = await repo.listSearchableChunks();
    expect(chunks.map((chunk) => chunk.ordinal)).toEqual([0, 1]);
    expect(chunks[1]).toMatchObject({ documentId: id, documentTitle: "시장리스크 보고서.pdf", embedding: [0.3, 0.4] });
  });

  it("stores large documents in batches", async () => {
    const repo = open();
    const chunks = Array.from({ length: 1200 }, (_, index) => ({ content: `청크 ${index}`, charStart: index, charEnd: index + 1, embedding: [index] }));
    await repo.createDocument(sampleDocument({ chunks }));
    expect(await repo.listSearchableChunks()).toHaveLength(1200);
  });

  it("deletes a document together with its chunks", async () => {
    const repo = open();
    const keep = await repo.createDocument(sampleDocument({ fileName: "keep.pdf" }));
    const drop = await repo.createDocument(sampleDocument({ fileName: "drop.pdf" }));

    const removed = await repo.deleteDocument(drop);
    expect(removed?.storageKey).toBe("secure-rag/1/1-abc.pdf");
    expect((await repo.listDocuments()).map((document) => document.id)).toEqual([keep]);
    expect((await repo.listSearchableChunks()).every((chunk) => chunk.documentId === keep)).toBe(true);
    expect(await repo.deleteDocument(drop)).toBeUndefined();
  });

  it("upserts demo states", async () => {
    const repo = open();
    await repo.setDemoState("demo-risk", false);
    await repo.setDemoState("demo-risk", true);
    await repo.setDemoState("demo-tax", false);
    const states = Object.fromEntries((await repo.listDemoStates()).map((row) => [row.demoId, row.enabled]));
    expect(states).toEqual({ "demo-risk": 1, "demo-tax": 0 });
  });
});
