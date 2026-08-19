import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const ragDocuments = mysqlTable("rag_documents", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 32 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
  status: mysqlEnum("status", ["uploaded", "processing", "ready", "failed"]).default("uploaded").notNull(),
  extractedCharacters: int("extractedCharacters").default(0).notNull(),
  chunkCount: int("chunkCount").default(0).notNull(),
  parsingScore: int("parsingScore").default(0).notNull(),
  parsingDurationMs: int("parsingDurationMs").default(0).notNull(),
  embeddingScore: int("embeddingScore").default(0).notNull(),
  embeddingCoverage: int("embeddingCoverage").default(0).notNull(),
  embeddingDurationMs: int("embeddingDurationMs").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const ragChunks = mysqlTable("rag_chunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  ordinal: int("ordinal").notNull(),
  content: text("content").notNull(),
  charStart: int("charStart").notNull(),
  charEnd: int("charEnd").notNull(),
  embedding: json("embedding").$type<number[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type RagDocument = typeof ragDocuments.$inferSelect;
export type RagChunk = typeof ragChunks.$inferSelect;
