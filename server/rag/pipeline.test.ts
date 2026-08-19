import { describe, expect, it } from "vitest";
import { buildGroundedAnswer, buildImprovementGuide, buildStages, calculateEmbeddingCoverage, chunkText, createEmbedding, filterGroundedCandidates, hybridSearch, DEMO_CHUNKS } from "./pipeline";

describe("금융 RAG 파이프라인", () => {
  it("문장을 겹침을 갖는 검색 단위로 분할한다", () => {
    const chunks = chunkText("시장리스크 한도 관리 절차를 준수한다. ".repeat(90));
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.content.length > 80)).toBe(true);
  });

  it("의미·키워드 하이브리드 검색이 시장리스크 근거를 반환한다", () => {
    const results = hybridSearch("VaR 한도 초과 보고", DEMO_CHUNKS, 3);
    expect(results).toHaveLength(3);
    expect(results[0].documentTitle).toContain("시장리스크");
    expect(results[0].hybridScore).toBeGreaterThan(0);
    expect(createEmbedding("금융 리스크")).toHaveLength(64);
    expect(calculateEmbeddingCoverage([{ embedding: createEmbedding("금융 리스크") }])).toBe(100);
  });

  it("가장 낮은 점수가 아니라 앞단의 첫 미달 단계를 개선 대상으로 선정한다", () => {
    const guide = buildImprovementGuide(buildStages({ parse: 94, embed: 89, retrieve: 72, generate: 95 }));
    expect(guide.stageId).toBe("embed");
    expect(guide.stageTitle).toContain("임베딩");
  });

  it("실측 소요시간과 커버리지를 단계 카드 데이터로 반영한다", () => {
    const stages = buildStages({ parse: 93, embed: 92 }, { parsingDurationMs: 642, embeddingDurationMs: 81, embeddingCoverage: 100 });
    expect(stages[0]).toMatchObject({ score: 93, duration: "642ms" });
    expect(stages[1]).toMatchObject({ score: 92, metric: "커버리지 100%" });
  });

  it("무관한 질의는 우연한 벡터 유사도를 근거로 답변하지 않는다", () => {
    const content = "기업여신 심사 시 담보인정비율과 재무등급을 평가한다.";
    const chunks = [{ id: "credit-1", documentTitle: "여신 기준", ordinal: 0, content, embedding: createEmbedding(content) }];
    const candidates = filterGroundedCandidates(hybridSearch("이탈리아 피자 도우 발효 레시피", chunks, 3));
    expect(candidates).toHaveLength(0);
    expect(buildGroundedAnswer("이탈리아 피자 도우 발효 레시피", candidates).groundedness).toBe(0);
  });
});
