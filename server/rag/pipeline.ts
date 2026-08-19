export type PipelineStageId = "parse" | "embed" | "retrieve" | "generate";

export type PipelineStage = {
  id: PipelineStageId;
  order: number;
  title: string;
  subtitle: string;
  score: number;
  duration: string;
  status: "ready" | "attention";
  signal: string;
  metric: string;
};

export type SearchChunk = {
  id: string | number;
  documentTitle: string;
  ordinal: number;
  content: string;
  embedding: number[];
  tags?: string[];
};

const DIMENSION = 64;
const FINANCE_STOPWORDS = new Set(["및", "의", "을", "를", "은", "는", "이", "가", "에", "와", "과", "으로", "에서", "대한", "관련", "기준", "관리"]);
const KOREAN_PARTICLE_SUFFIXES = ["으로부터", "에게서", "에서는", "으로", "에서", "에게", "까지", "부터", "처럼", "보다", "라도", "에는", "의", "은", "는", "이", "가", "을", "를", "와", "과", "에", "로", "도", "만"];
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  "증여": ["증여세", "증여재산"],
  "증여세": ["증여", "증여재산"],
  "납세": ["납세의무", "납부의무", "과세요건"],
  "납부": ["납세의무", "납부의무"],
  "의무": ["납세의무", "납부의무"],
  "책임": ["납세의무", "납부의무"],
  "언제": ["성립시기", "성립", "취득시점"],
  "발생": ["성립시기", "성립", "취득시점"],
  "시점": ["성립시기", "취득시점"],
  "성립": ["성립시기", "과세요건"],
  "여신": ["대출", "신용", "심사"],
  "대출": ["여신", "신용"],
  "이상거래": ["의심거래", "에스컬레이션"],
};

export const DEMO_DOCUMENTS = [
  { id: "demo-risk", title: "2025년 1분기 시장리스크 관리 보고서", type: "PDF", size: "2.4 MB", status: "READY", chunks: 24, score: 94, updatedAt: "오늘 09:12" },
  { id: "demo-credit", title: "기업여신 심사 및 승인 기준", type: "DOCX", size: "1.8 MB", status: "READY", chunks: 18, score: 91, updatedAt: "어제 16:45" },
  { id: "demo-control", title: "내부통제 운영규정 및 이상거래 대응", type: "PPTX", size: "4.1 MB", status: "READY", chunks: 31, score: 88, updatedAt: "2026.08.14" },
  { id: "demo-tax", title: "증여세 신고 및 납세의무 실무 안내", type: "PDF", size: "1.2 MB", status: "READY", chunks: 16, score: 93, updatedAt: "2026.08.19" },
] as const;

const demoRawChunks: Omit<SearchChunk, "embedding">[] = [
  {
    id: "risk-01",
    documentTitle: "2025년 1분기 시장리스크 관리 보고서",
    ordinal: 4,
    tags: ["시장리스크", "VaR", "한도"],
    content: "시장리스크 한도는 일별 VaR, 스트레스 손실 및 민감도 한도를 병행하여 관리한다. 일별 VaR 사용률이 80%를 초과하면 리스크관리부가 원인을 분석하고, 90% 초과 시 한도관리협의체에 즉시 보고한다.",
  },
  {
    id: "risk-02",
    documentTitle: "2025년 1분기 시장리스크 관리 보고서",
    ordinal: 9,
    tags: ["스트레스 테스트", "보고"],
    content: "스트레스 테스트는 월 1회 이상 실시하며, 금리 200bp 상승과 주가 30% 하락을 포함한 복합 충격 시나리오를 적용한다. 결과가 조기경보 기준을 초과하는 경우 익영업일 내 CRO에게 보고한다.",
  },
  {
    id: "credit-01",
    documentTitle: "기업여신 심사 및 승인 기준",
    ordinal: 3,
    tags: ["여신", "심사", "등급"],
    content: "기업여신 신규 취급 시 재무등급, 산업위험, 담보인정비율 및 현금흐름을 종합 평가한다. 신용등급이 하락하거나 약정조건 위반이 발생하면 여신심사부는 재심사 여부를 검토해야 한다.",
  },
  {
    id: "credit-02",
    documentTitle: "기업여신 심사 및 승인 기준",
    ordinal: 11,
    tags: ["승인", "전결", "리스크"],
    content: "한도 증액 또는 예외 승인 건은 원 승인 조건, 사유, 예상 손실 및 완화 조치를 포함하여 심의한다. 고위험 산업 익스포저는 독립적인 리스크 검토 의견을 첨부한다.",
  },
  {
    id: "control-01",
    documentTitle: "내부통제 운영규정 및 이상거래 대응",
    ordinal: 6,
    tags: ["이상거래", "내부통제", "에스컬레이션"],
    content: "이상거래 탐지 시 영업점은 거래 보류 여부를 판단하고, 고위험 신호가 확인되면 준법감시부에 즉시 에스컬레이션한다. 조사 과정과 판단 근거는 업무일지에 기록하여 사후 검증 가능성을 확보한다.",
  },
  {
    id: "control-02",
    documentTitle: "내부통제 운영규정 및 이상거래 대응",
    ordinal: 14,
    tags: ["접근권한", "모니터링"],
    content: "중요 정보 접근권한은 최소권한 원칙에 따라 부여하며 분기별로 적정성을 재검토한다. 권한 변경과 해지 이력은 감사 추적이 가능하도록 보관한다.",
  },
  {
    id: "tax-01",
    documentTitle: "증여세 신고 및 납세의무 실무 안내",
    ordinal: 2,
    tags: ["증여세", "납세의무", "성립시기"],
    content: "증여세의 납세의무는 증여로 재산을 취득하는 때 성립한다. 실무 검토 시에는 증여일, 재산 취득일, 계약 내용과 등기 여부 등 거래 사실관계를 함께 확인한다. 이 안내는 내부 교육용 요약이며 개별 거래의 세무 판단은 담당 부서 검토가 필요하다.",
  },
  {
    id: "tax-02",
    documentTitle: "증여세 신고 및 납세의무 실무 안내",
    ordinal: 7,
    tags: ["증여재산", "신고", "수증자"],
    content: "증여재산에 대한 신고 검토는 수증자, 증여재산의 종류와 취득 시점을 기준으로 자료를 정리한다. 신고기한과 과세가액 산정에 영향을 주는 예외 사항은 최신 세법과 내부 세무 검토 절차에 따라 별도로 확인한다.",
  },
];

export const DEMO_CHUNKS: SearchChunk[] = demoRawChunks.map((chunk) => ({ ...chunk, embedding: createEmbedding(chunk.content) }));

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

function expandKoreanToken(token: string) {
  const suffix = KOREAN_PARTICLE_SUFFIXES.find((candidate) => token.endsWith(candidate) && token.length - candidate.length >= 2);
  const normalized = suffix ? token.slice(0, -suffix.length) : token;
  return normalized === token ? [token] : [token, normalized];
}

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/gi, " ")
    .split(/\s+/)
    .flatMap(expandKoreanToken)
    .filter((word) => word.length > 1 && !FINANCE_STOPWORDS.has(word));
}

export function expandDomainTerms(tokens: string[]) {
  return Array.from(new Set(tokens.flatMap((token) => [token, ...(DOMAIN_SYNONYMS[token] ?? [])])));
}

export function createEmbedding(text: string): number[] {
  const vector = Array.from({ length: DIMENSION }, () => 0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const index = hash(token) % DIMENSION;
    vector[index] += 1;
    if (token.length > 3) vector[hash(token.slice(0, 3)) % DIMENSION] += 0.35;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  return dot / ((Math.sqrt(leftMagnitude) || 1) * (Math.sqrt(rightMagnitude) || 1));
}

export function chunkText(input: string, targetSize = 560, overlap = 90) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const chunks: Array<{ content: string; charStart: number; charEnd: number }> = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + targetSize, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf(". ", end), normalized.lastIndexOf("다. ", end), normalized.lastIndexOf("\n", end));
      if (boundary > start + targetSize * 0.58) end = boundary + 1;
    }
    const content = normalized.slice(start, end).trim();
    if (content) chunks.push({ content, charStart: start, charEnd: end });
    if (end === normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function calculateParsingScore(text: string, chunks: Array<{ content: string }>) {
  if (!text.trim()) return 0;
  const usableChunks = chunks.filter((chunk) => chunk.content.length >= 80).length;
  const chunkHealth = chunks.length ? usableChunks / chunks.length : 0;
  const density = Math.min(1, text.replace(/\s/g, "").length / 1500);
  return Math.round(Math.min(99, 72 + chunkHealth * 17 + density * 10));
}

export function calculateEmbeddingScore(chunks: Array<{ embedding: number[]; content: string }>) {
  if (!chunks.length) return 0;
  const valid = chunks.filter((chunk) => chunk.embedding.length === DIMENSION && chunk.embedding.some((value) => value !== 0)).length;
  const averageTokens = chunks.reduce((sum, chunk) => sum + tokenize(chunk.content).length, 0) / chunks.length;
  return Math.round(Math.min(99, 68 + (valid / chunks.length) * 22 + Math.min(1, averageTokens / 35) * 9));
}

export function calculateEmbeddingCoverage(chunks: Array<{ embedding: number[] }>) {
  if (!chunks.length) return 0;
  const valid = chunks.filter((chunk) => chunk.embedding.length === DIMENSION && chunk.embedding.some((value) => value !== 0)).length;
  return Math.round((valid / chunks.length) * 100);
}

export function hybridSearch(query: string, chunks: SearchChunk[], limit = 3) {
  const queryTokens = expandDomainTerms(tokenize(query));
  const queryEmbedding = createEmbedding(query);
  const documentFrequency = new Map<string, number>();
  chunks.forEach((chunk) => {
    const unique = new Set(tokenize(chunk.content));
    unique.forEach((token) => documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1));
  });
  const averageLength = chunks.reduce((sum, chunk) => sum + tokenize(chunk.content).length, 0) / Math.max(chunks.length, 1);
  return chunks
    .map((chunk) => {
      const terms = tokenize(chunk.content);
      const frequency = new Map<string, number>();
      terms.forEach((term) => frequency.set(term, (frequency.get(term) ?? 0) + 1));
      const bm25Raw = queryTokens.reduce((sum, term) => {
        const tf = frequency.get(term) ?? 0;
        const idf = Math.log(1 + (chunks.length - (documentFrequency.get(term) ?? 0) + 0.5) / ((documentFrequency.get(term) ?? 0) + 0.5));
        return sum + idf * ((tf * 2.1) / (tf + 1.2 * (1 - 0.75 + 0.75 * (terms.length / Math.max(averageLength, 1)))));
      }, 0);
      const keywordScore = Math.min(100, Math.round((bm25Raw / Math.max(queryTokens.length, 1)) * 60));
      const semanticScore = Math.max(0, Math.min(100, Math.round(cosineSimilarity(queryEmbedding, chunk.embedding) * 100)));
      const matchedTerms = queryTokens.filter((term) => frequency.has(term));
      const lexicalMatchCount = new Set(matchedTerms).size;
      const hybridScore = Math.round(keywordScore * 0.46 + semanticScore * 0.54);
      return { ...chunk, keywordScore, semanticScore, hybridScore, matchedTerms: Array.from(new Set(matchedTerms)), lexicalMatchCount };
    })
    .sort((left, right) => right.hybridScore - left.hybridScore)
    .slice(0, limit);
}

/**
 * A hash-based demo embedding can produce accidental similarity for unrelated
 * text. Require an observable lexical signal before any chunk can reach
 * generation. In production this gate should be calibrated against a labelled
 * evaluation set alongside the embedding reranker.
 */
export function filterGroundedCandidates(candidates: ReturnType<typeof hybridSearch>) {
  return candidates.filter((candidate) => candidate.lexicalMatchCount > 0 && candidate.keywordScore >= 4 && candidate.hybridScore >= 8);
}

export function calculateRetrievalScore(results: Array<{ hybridScore: number }>) {
  if (!results.length) return 0;
  const weighted = results.reduce((sum, item, index) => sum + item.hybridScore * (index === 0 ? 0.5 : index === 1 ? 0.32 : 0.18), 0);
  return Math.round(Math.min(99, 48 + weighted * 0.56));
}

export function calculateGenerationScore(candidateCount: number, citationCoverage: number) {
  if (!candidateCount) return 0;
  return Math.round(Math.min(99, 70 + Math.min(candidateCount, 3) * 7 + citationCoverage * 0.08));
}

export function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function buildStages(
  scores?: Partial<Record<PipelineStageId, number>>,
  measures?: { parsingDurationMs?: number; embeddingDurationMs?: number; retrievalDurationMs?: number; generationDurationMs?: number; embeddingCoverage?: number },
): PipelineStage[] {
  const parse = scores?.parse ?? 94;
  const embed = scores?.embed ?? 89;
  const retrieve = scores?.retrieve ?? 78;
  const generate = scores?.generate ?? 96;
  return [
    { id: "parse", order: 1, title: "문서 파싱 · 청킹", subtitle: "Format-aware extraction", score: parse, duration: formatDuration(measures?.parsingDurationMs ?? 1800), status: parse >= 90 ? "ready" : "attention", signal: "텍스트 회수율 · 청크 경계", metric: "추출 품질" },
    { id: "embed", order: 2, title: "임베딩 색인", subtitle: "Private vector store", score: embed, duration: formatDuration(measures?.embeddingDurationMs ?? 2400), status: embed >= 90 ? "ready" : "attention", signal: "벡터 커버리지 · 분산", metric: `커버리지 ${measures?.embeddingCoverage ?? 100}%` },
    { id: "retrieve", order: 3, title: "하이브리드 검색", subtitle: "BM25 + semantic", score: retrieve, duration: formatDuration(measures?.retrievalDurationMs ?? 184), status: retrieve >= 90 ? "ready" : "attention", signal: "Top-k 적합도 · 용어 재현율", metric: "Top-3 후보" },
    { id: "generate", order: 4, title: "근거 기반 답변", subtitle: "Candidate-only context", score: generate, duration: formatDuration(measures?.generationDurationMs ?? 1200), status: generate >= 90 ? "ready" : "attention", signal: "인용 충실도 · 완결성", metric: "후보 외 컨텍스트 0" },
  ];
}

const improvementPlaybook: Record<PipelineStageId, { rationale: string; actions: string[] }> = {
  parse: { rationale: "이 단계의 누락은 이후 임베딩·검색·답변에서 회복할 수 없습니다.", actions: ["표·머리글·스캔 페이지의 추출 성공률을 표본 검수합니다.", "문서 유형별 청크 길이와 문장 경계 규칙을 조정합니다."] },
  embed: { rationale: "검색 후보의 의미적 범위는 임베딩 커버리지와 도메인 적합도에 의해 결정됩니다.", actions: ["금융 용어가 포함된 검증 질의로 모델 재현율을 측정합니다.", "무의미·중복 청크를 제거하고 도메인 모델을 비교 평가합니다."] },
  retrieve: { rationale: "후보 선정 오류는 올바른 근거가 생성 단계에 전달되지 않게 만듭니다.", actions: ["사내 약어는 BM25 용어 사전과 동의어 사전에 추가합니다.", "BM25·의미 유사도 가중치와 Top-k를 검증 집합으로 튜닝합니다."] },
  generate: { rationale: "생성 단계는 후보 근거 안에서만 답해야 하므로 인용 충실도를 점검합니다.", actions: ["근거 청크의 문장만 사용하도록 프롬프트와 인용 검증을 강화합니다.", "답변 완결성 및 근거 일치성에 대한 사람 검수를 수행합니다."] },
};

export function buildImprovementGuide(stages: PipelineStage[]) {
  const target = 90;
  const firstGap = [...stages].sort((left, right) => left.order - right.order).find((stage) => stage.score < target);
  const stage = firstGap ?? stages[0];
  const playbook = improvementPlaybook[stage.id];
  return {
    stageId: stage.id,
    stageTitle: stage.title,
    score: stage.score,
    target,
    rationale: firstGap
      ? `${playbook.rationale} 뒤 단계에 더 낮은 점수가 있어도, 앞단 미달을 먼저 해소해야 전체 품질의 상한을 올릴 수 있습니다.`
      : "모든 앞단 품질 게이트가 목표를 통과했습니다. 검색·생성의 정밀도 개선을 다음 실험으로 진행할 수 있습니다.",
    actions: playbook.actions,
  };
}

export function buildGroundedAnswer(query: string, candidates: ReturnType<typeof hybridSearch>) {
  const sources = candidates.slice(0, 3);
  if (!sources.length) {
    return {
      answer: `질의 **“${query}”**와 직접 연결되는 후보 청크를 현재 사내 문서에서 찾지 못했습니다. 근거가 부족하므로 답변을 생성하지 않습니다.\n\n다른 업무 용어를 사용하거나, 해당 주제의 문서를 등록한 뒤 다시 검색해 주세요.`,
      groundedness: 0,
      citationCoverage: 0,
    };
  }
  const keyPoints = sources.map((source, index) => `**${index + 1}. ${source.documentTitle} · 청크 ${source.ordinal + 1}** — ${source.content}`).join("\n\n");
  return {
    answer: `질의 **“${query}”**에 대해 사내 후보 청크 ${sources.length}개만을 근거로 정리했습니다.\n\n${keyPoints}\n\n> 이 답변은 선택된 후보 컨텍스트 외의 문서 내용이나 외부 지식을 사용하지 않습니다.`,
    groundedness: calculateGenerationScore(sources.length, sources.length ? 100 : 0),
    citationCoverage: sources.length ? 100 : 0,
  };
}
