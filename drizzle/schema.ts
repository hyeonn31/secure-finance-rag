import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = () => new Date();

export const ragDocuments = sqliteTable("rag_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("ownerId").notNull(),
  fileName: text("fileName").notNull(),
  fileType: text("fileType").notNull(),
  storageKey: text("storageKey").notNull(),
  status: text("status", { enum: ["uploaded", "processing", "ready", "failed"] }).default("uploaded").notNull(),
  extractedCharacters: integer("extractedCharacters").default(0).notNull(),
  chunkCount: integer("chunkCount").default(0).notNull(),
  parsingScore: integer("parsingScore").default(0).notNull(),
  parsingDurationMs: integer("parsingDurationMs").default(0).notNull(),
  embeddingScore: integer("embeddingScore").default(0).notNull(),
  embeddingCoverage: integer("embeddingCoverage").default(0).notNull(),
  embeddingDurationMs: integer("embeddingDurationMs").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(now).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(now).$onUpdateFn(now).notNull(),
});

export const ragChunks = sqliteTable(
  "rag_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: integer("documentId").notNull().references(() => ragDocuments.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    content: text("content").notNull(),
    charStart: integer("charStart").notNull(),
    charEnd: integer("charEnd").notNull(),
    embedding: text("embedding", { mode: "json" }).$type<number[]>().notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(now).notNull(),
  },
  (table) => [index("rag_chunks_document_idx").on(table.documentId)],
);

export const ragDemoStates = sqliteTable("rag_demo_states", {
  demoId: text("demoId").primaryKey(),
  enabled: integer("enabled").default(1).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(now).$onUpdateFn(now).notNull(),
});

export type RagDocument = typeof ragDocuments.$inferSelect;
export type RagChunk = typeof ragChunks.$inferSelect;
export type RagDemoState = typeof ragDemoStates.$inferSelect;
