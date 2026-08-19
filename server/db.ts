import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, ragChunks, ragDocuments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

type CreateDocumentInput = {
  ownerId: number;
  fileName: string;
  fileType: string;
  storageKey: string;
  storageUrl: string;
  extractedCharacters: number;
  parsingScore: number;
  parsingDurationMs: number;
  embeddingScore: number;
  embeddingCoverage: number;
  embeddingDurationMs: number;
  chunks: Array<{ content: string; charStart: number; charEnd: number; embedding: number[] }>;
};

export async function createRagDocument(input: CreateDocumentInput) {
  const db = await getDb();
  if (!db) throw new Error("문서 저장소 데이터베이스에 연결할 수 없습니다.");
  const insert = await db.insert(ragDocuments).values({
    ownerId: input.ownerId,
    fileName: input.fileName,
    fileType: input.fileType,
    storageKey: input.storageKey,
    storageUrl: input.storageUrl,
    status: "ready",
    extractedCharacters: input.extractedCharacters,
    chunkCount: input.chunks.length,
    parsingScore: input.parsingScore,
    parsingDurationMs: input.parsingDurationMs,
    embeddingScore: input.embeddingScore,
    embeddingCoverage: input.embeddingCoverage,
    embeddingDurationMs: input.embeddingDurationMs,
  });
  const documentId = Number(insert[0].insertId);
  if (input.chunks.length) {
    await db.insert(ragChunks).values(
      input.chunks.map((chunk, ordinal) => ({ documentId, ordinal, ...chunk })),
    );
  }
  return documentId;
}

export async function listRagDocuments(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ragDocuments)
    .where(ownerId ? eq(ragDocuments.ownerId, ownerId) : undefined)
    .orderBy(desc(ragDocuments.createdAt));
}

export async function listSearchableChunks(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];
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
    .where(ownerId ? and(eq(ragDocuments.ownerId, ownerId), eq(ragDocuments.status, "ready")) : eq(ragDocuments.status, "ready"));
}

export async function getOwnedRagDocument(documentId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("문서 저장소 데이터베이스에 연결할 수 없습니다.");
  const result = await db.select().from(ragDocuments).where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function deleteOwnedRagDocument(documentId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("문서 저장소 데이터베이스에 연결할 수 없습니다.");
  await db.delete(ragChunks).where(eq(ragChunks.documentId, documentId));
  const result = await db.delete(ragDocuments).where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.ownerId, ownerId)));
  if (result[0].affectedRows !== 1) throw new Error("삭제할 문서를 찾을 수 없거나 권한이 없습니다.");
}
