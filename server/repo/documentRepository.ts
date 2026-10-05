import type { RagDemoState, RagDocument } from "../../drizzle/schema";

export type NewDocument = {
  ownerId: number;
  fileName: string;
  fileType: string;
  storageKey: string;
  extractedCharacters: number;
  parsingScore: number;
  parsingDurationMs: number;
  embeddingScore: number;
  embeddingCoverage: number;
  embeddingDurationMs: number;
  chunks: Array<{ content: string; charStart: number; charEnd: number; embedding: number[] }>;
};

export type SearchableChunk = {
  id: number;
  documentId: number;
  documentTitle: string;
  ordinal: number;
  content: string;
  embedding: number[];
};

// The router only talks to this interface. SQLite is the one implementation today;
// a server deployment would add e.g. a PostgreSQL + pgvector implementation here.
export interface DocumentRepository {
  createDocument(input: NewDocument): Promise<number>;
  listDocuments(): Promise<RagDocument[]>;
  listSearchableChunks(): Promise<SearchableChunk[]>;
  /** Removes the document and its chunks; returns what was removed so the caller can clean up storage. */
  deleteDocument(documentId: number): Promise<RagDocument | undefined>;
  listDemoStates(): Promise<RagDemoState[]>;
  setDemoState(demoId: string, enabled: boolean): Promise<void>;
}
