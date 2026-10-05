import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "../../drizzle/schema";
import { ragChunks, ragDemoStates, ragDocuments } from "../../drizzle/schema";
import type { DocumentRepository, NewDocument, SearchableChunk } from "./documentRepository";

// Kept next to drizzle/schema.ts on purpose; sqliteRepository.test.ts fails if the two drift apart.
export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "rag_documents" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "ownerId" integer NOT NULL,
  "fileName" text NOT NULL,
  "fileType" text NOT NULL,
  "storageKey" text NOT NULL,
  "status" text DEFAULT 'uploaded' NOT NULL,
  "extractedCharacters" integer DEFAULT 0 NOT NULL,
  "chunkCount" integer DEFAULT 0 NOT NULL,
  "parsingScore" integer DEFAULT 0 NOT NULL,
  "parsingDurationMs" integer DEFAULT 0 NOT NULL,
  "embeddingScore" integer DEFAULT 0 NOT NULL,
  "embeddingCoverage" integer DEFAULT 0 NOT NULL,
  "embeddingDurationMs" integer DEFAULT 0 NOT NULL,
  "createdAt" integer NOT NULL,
  "updatedAt" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "rag_chunks" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "documentId" integer NOT NULL REFERENCES "rag_documents"("id") ON DELETE CASCADE,
  "ordinal" integer NOT NULL,
  "content" text NOT NULL,
  "charStart" integer NOT NULL,
  "charEnd" integer NOT NULL,
  "embedding" text NOT NULL,
  "createdAt" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "rag_chunks_document_idx" ON "rag_chunks" ("documentId");
CREATE TABLE IF NOT EXISTS "rag_demo_states" (
  "demoId" text PRIMARY KEY NOT NULL,
  "enabled" integer DEFAULT 1 NOT NULL,
  "updatedAt" integer NOT NULL
);
`;

// Each chunk row binds 7 values; stay well under SQLite's bound-parameter limit.
const CHUNK_BATCH_SIZE = 500;

export function openSqliteRepository(dbPath: string): DocumentRepository & { close(): void } {
  if (dbPath !== ":memory:") mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(BOOTSTRAP_SQL);
  const db = drizzle(sqlite, { schema });

  return {
    async createDocument(input: NewDocument) {
      return db.transaction((tx) => {
        const inserted = tx
          .insert(ragDocuments)
          .values({
            ownerId: input.ownerId,
            fileName: input.fileName,
            fileType: input.fileType,
            storageKey: input.storageKey,
            status: "ready",
            extractedCharacters: input.extractedCharacters,
            chunkCount: input.chunks.length,
            parsingScore: input.parsingScore,
            parsingDurationMs: input.parsingDurationMs,
            embeddingScore: input.embeddingScore,
            embeddingCoverage: input.embeddingCoverage,
            embeddingDurationMs: input.embeddingDurationMs,
          })
          .returning({ id: ragDocuments.id })
          .get();
        if (!inserted) throw new Error("문서를 저장하지 못했습니다.");
        const { id } = inserted;
        const rows = input.chunks.map((chunk, ordinal) => ({ documentId: id, ordinal, ...chunk }));
        for (let start = 0; start < rows.length; start += CHUNK_BATCH_SIZE) {
          tx.insert(ragChunks).values(rows.slice(start, start + CHUNK_BATCH_SIZE)).run();
        }
        return id;
      });
    },

    async listDocuments() {
      return db.select().from(ragDocuments).orderBy(desc(ragDocuments.createdAt), desc(ragDocuments.id)).all();
    },

    async listSearchableChunks(): Promise<SearchableChunk[]> {
      return db
        .select({
          id: ragChunks.id,
          documentId: ragDocuments.id,
          documentTitle: ragDocuments.fileName,
          ordinal: ragChunks.ordinal,
          content: ragChunks.content,
          embedding: ragChunks.embedding,
        })
        .from(ragChunks)
        .innerJoin(ragDocuments, eq(ragChunks.documentId, ragDocuments.id))
        .where(eq(ragDocuments.status, "ready"))
        .orderBy(ragChunks.id)
        .all();
    },

    async deleteDocument(documentId: number) {
      return db.transaction((tx) => {
        const document = tx.select().from(ragDocuments).where(eq(ragDocuments.id, documentId)).get();
        if (!document) return undefined;
        tx.delete(ragChunks).where(eq(ragChunks.documentId, documentId)).run();
        tx.delete(ragDocuments).where(eq(ragDocuments.id, documentId)).run();
        return document;
      });
    },

    async listDemoStates() {
      return db.select().from(ragDemoStates).all();
    },

    async setDemoState(demoId: string, enabled: boolean) {
      const value = enabled ? 1 : 0;
      db.insert(ragDemoStates)
        .values({ demoId, enabled: value })
        .onConflictDoUpdate({ target: ragDemoStates.demoId, set: { enabled: value, updatedAt: new Date() } })
        .run();
    },

    close() {
      sqlite.close();
    },
  };
}
