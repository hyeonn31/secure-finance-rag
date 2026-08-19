import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createRagDocument, deleteOwnedRagDocument, deleteRagDocument, getOwnedRagDocument, getRagDocument, listDemoStates, listRagDocuments, listSearchableChunks, setDemoState } from "./db";
import { composeSearchCorpus, DEMO_DOCUMENT_IDS, resolveDemoStates } from "./rag/demoState";
import { parseFinanceDocument } from "./rag/parser";
import { buildGroundedAnswer, buildImprovementGuide, buildStages, calculateEmbeddingCoverage, calculateEmbeddingScore, calculateParsingScore, calculateRetrievalScore, chunkText, createEmbedding, DEMO_CHUNKS, DEMO_DOCUMENTS, formatDuration, hybridSearch, type SearchChunk } from "./rag/pipeline";
import { createAsciiStorageKey, getSupportedExtension } from "./rag/storageKey";
import { storagePut } from "./storage";

const base64FileSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(120),
  contentBase64: z.string().min(1),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  rag: router({
    dashboard: publicProcedure.query(async () => {
      const uploaded = await listRagDocuments();
      const demoStates = resolveDemoStates(await listDemoStates());
      const demoDocuments = DEMO_DOCUMENTS.map((document) => ({ ...document, isDeletable: false, isDemo: true, enabled: demoStates[document.id], status: demoStates[document.id] ? "READY" : "DISABLED" }));
      const recent = uploaded[0];
      const stages = buildStages(recent ? { parse: recent.parsingScore, embed: recent.embeddingScore } : undefined, recent ? { parsingDurationMs: recent.parsingDurationMs, embeddingDurationMs: recent.embeddingDurationMs, embeddingCoverage: recent.embeddingCoverage } : undefined);
      return {
        stages,
        improvement: buildImprovementGuide(stages),
        documents: [...demoDocuments, ...uploaded.map((document) => ({
          id: String(document.id), title: document.fileName, type: document.fileType.toUpperCase(), size: "암호화 저장", status: document.status.toUpperCase(), chunks: document.chunkCount, score: document.parsingScore, updatedAt: new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(document.updatedAt), isDeletable: true, isDemo: false, enabled: true,
        }))],
        documentCount: demoDocuments.filter((document) => document.enabled).length + uploaded.length,
        demoStates,
        latestIngest: recent ? { fileName: recent.fileName, parsingScore: recent.parsingScore, parsingDuration: formatDuration(recent.parsingDurationMs), embeddingScore: recent.embeddingScore, embeddingCoverage: recent.embeddingCoverage, embeddingDuration: formatDuration(recent.embeddingDurationMs), chunkCount: recent.chunkCount } : null,
        security: { network: "사내망 전용", contextPolicy: "Top-3 후보 청크만 전달", storage: "S3 암호화 저장" },
      };
    }),
    search: publicProcedure.input(z.object({ query: z.string().min(2).max(400) })).mutation(async ({ input }) => {
      const retrieveStartedAt = performance.now();
      const uploaded = await listSearchableChunks();
      const demoStates = resolveDemoStates(await listDemoStates());
      const privateChunks: SearchChunk[] = uploaded.map((chunk) => ({
        id: chunk.id,
        documentTitle: chunk.documentTitle,
        ordinal: chunk.ordinal,
        content: chunk.content,
        embedding: chunk.embedding,
      }));
      const candidates = hybridSearch(input.query, composeSearchCorpus(DEMO_CHUNKS, privateChunks, demoStates), 3);
      const retrievalDurationMs = performance.now() - retrieveStartedAt;
      const retrievalScore = calculateRetrievalScore(candidates);
      const generateStartedAt = performance.now();
      const response = buildGroundedAnswer(input.query, candidates);
      const generationDurationMs = performance.now() - generateStartedAt;
      const stages = buildStages({ retrieve: retrievalScore, generate: response.groundedness }, { retrievalDurationMs, generationDurationMs });
      return {
        ...response,
        candidates,
        stages,
        improvement: buildImprovementGuide(stages),
        timing: { retrieve: formatDuration(retrievalDurationMs), generate: formatDuration(generationDurationMs), total: formatDuration(retrievalDurationMs + generationDurationMs) },
      };
    }),
    ingest: protectedProcedure.input(base64FileSchema).mutation(async ({ input, ctx }) => {
      const data = Buffer.from(input.contentBase64, "base64");
      if (data.length > 10 * 1024 * 1024) throw new Error("데모 환경에서는 10MB 이하 파일만 업로드할 수 있습니다.");
      const extension = getSupportedExtension(input.fileName);
      const storageKey = createAsciiStorageKey(ctx.user.id, input.fileName);
      const stored = await storagePut(storageKey, data, input.mimeType || "application/octet-stream");
      const parsingStartedAt = performance.now();
      const parsed = await parseFinanceDocument(data, input.fileName);
      const rawChunks = chunkText(parsed.text);
      const parsingDurationMs = performance.now() - parsingStartedAt;
      const embeddingStartedAt = performance.now();
      const chunks = rawChunks.map((chunk) => ({ ...chunk, embedding: createEmbedding(chunk.content) }));
      const embeddingDurationMs = performance.now() - embeddingStartedAt;
      const parsingScore = calculateParsingScore(parsed.text, chunks);
      const embeddingScore = calculateEmbeddingScore(chunks);
      const embeddingCoverage = calculateEmbeddingCoverage(chunks);
      const documentId = await createRagDocument({
        ownerId: ctx.user.id,
        fileName: input.fileName,
        fileType: extension,
        storageKey: stored.key,
        storageUrl: stored.url,
        extractedCharacters: parsed.text.length,
        parsingScore,
        parsingDurationMs: Math.round(parsingDurationMs),
        embeddingScore,
        embeddingCoverage,
        embeddingDurationMs: Math.round(embeddingDurationMs),
        chunks,
      });
      return { documentId, parser: parsed.parser, sections: parsed.sections, chunkCount: chunks.length, parsingScore, parsingDuration: formatDuration(parsingDurationMs), embeddingScore, embeddingCoverage, embeddingDuration: formatDuration(embeddingDurationMs) };
    }),
    deleteDocument: protectedProcedure.input(z.object({ documentId: z.coerce.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      const document = isAdmin ? await getRagDocument(input.documentId) : await getOwnedRagDocument(input.documentId, ctx.user.id);
      if (!document) throw new Error("삭제할 문서를 찾을 수 없거나 권한이 없습니다.");
      if (isAdmin) await deleteRagDocument(document.id);
      else await deleteOwnedRagDocument(document.id, ctx.user.id);
      return { success: true, documentId: document.id, storageDetached: true } as const;
    }),
    setDemoEnabled: protectedProcedure.input(z.object({ demoId: z.enum(DEMO_DOCUMENT_IDS), enabled: z.boolean() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("데모 자료 상태는 관리자만 변경할 수 있습니다.");
      await setDemoState(input.demoId, input.enabled);
      return { success: true, ...input } as const;
    }),
    enableAllDemos: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("데모 자료 상태는 관리자만 변경할 수 있습니다.");
      await Promise.all(DEMO_DOCUMENT_IDS.map((demoId) => setDemoState(demoId, true)));
      return { success: true, enabledCount: DEMO_DOCUMENT_IDS.length } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
