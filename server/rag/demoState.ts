import { DEMO_DOCUMENTS, type SearchChunk } from "./pipeline";

export const DEMO_DOCUMENT_IDS = DEMO_DOCUMENTS.map((document) => document.id) as [string, ...string[]];
export type DemoDocumentId = (typeof DEMO_DOCUMENT_IDS)[number];

const chunkPrefixToDocumentId: Record<string, DemoDocumentId> = {
  risk: "demo-risk",
  credit: "demo-credit",
  control: "demo-control",
  tax: "demo-tax",
};

export function resolveDemoStates(rows: Array<{ demoId: string; enabled: number }> = []) {
  const stored = new Map(rows.map((row) => [row.demoId, Boolean(row.enabled)]));
  return Object.fromEntries(DEMO_DOCUMENT_IDS.map((id) => [id, stored.get(id) ?? true])) as Record<DemoDocumentId, boolean>;
}

export function getDemoDocumentIdFromChunk(chunk: SearchChunk): DemoDocumentId | undefined {
  const prefix = String(chunk.id).split("-")[0];
  return chunkPrefixToDocumentId[prefix];
}

export function filterActiveDemoChunks(chunks: SearchChunk[], states: Record<DemoDocumentId, boolean>) {
  return chunks.filter((chunk) => {
    const documentId = getDemoDocumentIdFromChunk(chunk);
    return documentId ? states[documentId] : false;
  });
}

export function composeSearchCorpus(demoChunks: SearchChunk[], uploadedChunks: SearchChunk[], states: Record<DemoDocumentId, boolean>) {
  return [...filterActiveDemoChunks(demoChunks, states), ...uploadedChunks];
}
