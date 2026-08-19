import { AIChatBox, type Message } from "@/components/AIChatBox";
import DashboardLayout, { type DashboardSection } from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { AlertTriangle, ArrowRight, Check, ChevronRight, Clock3, FileText, Gauge, Layers3, LockKeyhole, RefreshCw, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type SearchResponse = { answer: string; candidates: Array<{ id: string | number; documentTitle: string; ordinal: number; content: string; keywordScore: number; semanticScore: number; hybridScore: number }>; stages: Array<{ id: string; title: string; subtitle: string; score: number; duration: string; status: "ready" | "attention"; signal: string; metric: string }>; improvement: { stageTitle: string; score: number; target: number; rationale: string; actions: string[] }; timing: { retrieve: string; generate: string; total: string } };

const demoQuestions = ["시장리스크 한도 초과 시 보고 절차를 알려줘", "고위험 기업여신 예외 승인에는 무엇이 필요한가요?", "이상거래가 탐지되면 어떤 조치를 해야 하나요?"];
const fallbackStages = [
  { id: "parse", title: "문서 파싱 · 청킹", subtitle: "Format-aware extraction", score: 94, duration: "1.8s", status: "ready" as const, signal: "텍스트 회수율 · 청크 경계", metric: "데모 기준선" },
  { id: "embed", title: "임베딩 색인", subtitle: "Private vector store", score: 89, duration: "2.4s", status: "attention" as const, signal: "벡터 커버리지 · 분산", metric: "커버리지 100%" },
  { id: "retrieve", title: "하이브리드 검색", subtitle: "BM25 + semantic", score: 78, duration: "184ms", status: "attention" as const, signal: "Top-k 적합도 · 용어 재현율", metric: "Top-3 후보" },
  { id: "generate", title: "근거 기반 답변", subtitle: "Candidate-only context", score: 96, duration: "1.2s", status: "ready" as const, signal: "인용 충실도 · 완결성", metric: "후보 외 컨텍스트 0" },
];

function Score({ score, small = false }: { score: number; small?: boolean }) {
  return <div className={cn("score-ring grid shrink-0 place-items-center rounded-full", small ? "size-11" : "size-[58px]")} style={{ "--score": score } as React.CSSProperties}><div className={cn("grid place-items-center rounded-full bg-white font-bold text-[#173A2C]", small ? "size-[38px] text-[11px]" : "size-[50px] text-sm")}>{score}</div></div>;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [section, setSection] = useState<DashboardSection>(() => (new URLSearchParams(window.location.search).get("view") as DashboardSection) || "overview");
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dashboard = trpc.rag.dashboard.useQuery();
  const searchMutation = trpc.rag.search.useMutation({
    onSuccess: (result) => {
      setSearchResult(result);
      setMessages((previous) => [...previous, { role: "assistant", content: result.answer }]);
    },
    onError: () => toast.error("검색을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."),
  });
  const ingestMutation = trpc.rag.ingest.useMutation({
    onSuccess: (result) => { dashboard.refetch(); setUploading(false); toast.success(`${result.chunkCount}개 청크로 안전하게 색인했습니다.`); },
    onError: (error) => { setUploading(false); toast.error(error.message || "업로드를 완료하지 못했습니다."); },
  });

  const stages = searchResult?.stages ?? dashboard.data?.stages ?? fallbackStages;
  const improvement = searchResult?.improvement ?? dashboard.data?.improvement ?? { stageTitle: "임베딩 색인", score: 89, target: 90, rationale: "앞단 품질 게이트가 목표에 미달합니다. 검색 단계의 점수가 더 낮더라도, 앞단의 커버리지를 먼저 개선해야 전체 품질 상한을 높일 수 있습니다.", actions: ["도메인 용어 검증 질의로 재현율을 측정합니다.", "중복 청크를 정리하고 모델을 비교합니다."] };
  const documents = dashboard.data?.documents ?? [];

  function navigate(next: DashboardSection) { setSection(next); window.history.replaceState(null, "", `/?view=${next}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function sendQuestion(question: string) {
    setSection("search");
    setMessages((previous) => [...previous, { role: "user", content: question }]);
    searchMutation.mutate({ query: question });
  }
  async function handleFile(file?: File) {
    if (!file) return;
    if (!isAuthenticated) { startLogin(); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("10MB 이하 파일만 업로드할 수 있습니다."); return; }
    const accepted = ["pdf", "docx", "xlsx", "pptx"];
    if (!accepted.includes(file.name.split(".").pop()?.toLowerCase() ?? "")) { toast.error("PDF, DOCX, XLSX, PPTX 형식만 지원합니다."); return; }
    setUploading(true);
    const raw = await file.arrayBuffer();
    const base64 = btoa(Array.from(new Uint8Array(raw), (byte) => String.fromCharCode(byte)).join(""));
    ingestMutation.mutate({ fileName: file.name, mimeType: file.type, contentBase64: base64 });
  }

  return <DashboardLayout activeSection={section} onNavigate={navigate}>
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#DFE5DE] bg-[#F6F7F5]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#0C211B] text-[#CBEEDB] lg:hidden"><ShieldCheck className="size-[18px]" /></div><div><p className="eyebrow">Secure Finance Intelligence</p><h1 className="mt-0.5 text-[15px] font-semibold tracking-tight">사내 지식 검색 운영실</h1></div></div>
      <div className="flex items-center gap-2 rounded-full border border-[#CBE2D2] bg-[#EFF7F0] px-3 py-1.5 text-[11px] font-semibold text-[#186340]"><span className="size-1.5 rounded-full bg-[#22A365]" /> PRIVATE NETWORK <span className="hidden border-l border-[#CBE2D2] pl-2 sm:inline">외부 전송 없음</span></div>
    </header>

    <div className="mx-auto max-w-[1510px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      {section === "overview" && <div className="space-y-7 rise-in">
        <section className="grid gap-6 xl:grid-cols-[1.38fr_.62fr]">
          <div className="overflow-hidden rounded-[28px] bg-[#103027] px-7 py-8 text-white shadow-[0_24px_55px_rgba(20,62,45,.16)] sm:px-9">
            <div className="flex items-center justify-between"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[.14em] text-[#CBEEDB]">RAG CONTROL PLANE</span><LockKeyhole className="size-5 text-[#B4E9C8]" /></div>
            <h2 className="display-serif mt-7 max-w-[620px] text-[38px] leading-[1.05] sm:text-[48px]">문서 밖으로 나가지 않는<br /><em className="font-normal text-[#BDECCD]">정확한 금융 지식 검색.</em></h2>
            <p className="mt-5 max-w-[615px] text-sm leading-6 text-[#C5D5CC]">파싱부터 후보 추출, 근거 기반 답변까지 전 과정을 측정합니다. 모델에는 검색된 Top-3 후보 청크만 전달됩니다.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => navigate("search")} className="h-10 rounded-xl bg-[#CBEEDB] px-4 text-xs font-bold text-[#103027] hover:bg-[#E4F8EA]"><Sparkles className="mr-2 size-4" />검색 실험 시작</Button><Button variant="outline" onClick={() => navigate("documents")} className="h-10 rounded-xl border-white/20 bg-transparent px-4 text-xs text-white hover:bg-white/10 hover:text-white">문서 저장소 보기 <ArrowRight className="ml-2 size-3.5" /></Button></div>
          </div>
          <div className="rounded-[28px] border border-[#DFE5DE] bg-white p-6 shadow-[0_12px_28px_rgba(16,48,39,.05)]">
            <div className="flex items-start justify-between"><div><p className="eyebrow">CONTROL POLICY</p><h3 className="mt-2 text-lg font-semibold tracking-tight">컨텍스트 접근 정책</h3></div><ShieldCheck className="size-5 text-[#267B53]" /></div>
            <div className="mt-6 space-y-3">{[["01", "S3 암호화 저장", "원본 파일과 메타데이터 분리"], ["02", "사내망 검색", "BM25 + 의미 유사도 병행"], ["03", "후보 청크 한정", "전체 원문을 모델에 전달하지 않음"]].map(([number, title, detail]) => <div key={number} className="flex gap-3 rounded-2xl bg-[#F4F7F4] p-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#DDF2E4] text-[10px] font-bold text-[#176B48]">{number}</span><div><p className="text-xs font-semibold">{title}</p><p className="mt-0.5 text-[11px] text-[#62766A]">{detail}</p></div></div>)}</div>
          </div>
        </section>
        <section className="rounded-[28px] border border-[#DFE5DE] bg-white p-5 shadow-[0_12px_28px_rgba(16,48,39,.045)] sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">END-TO-END OBSERVABILITY</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">파이프라인 품질 체인</h2><p className="mt-1 text-sm text-[#64766C]">앞단 품질 게이트를 먼저 통과해야 다음 단계 개선의 효과가 누적됩니다.</p></div><div className="flex items-center gap-2 text-xs text-[#547362]"><Gauge className="size-4" />목표 임계값 <b className="text-[#173A2C]">90점</b></div></div>
          <div className="mt-7 grid gap-3 xl:grid-cols-4">{stages.map((stage, index) => <div key={stage.id} className="relative rounded-2xl border border-[#E0E8E1] bg-[#FBFCFB] p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.12em] text-[#6C8174]">STEP 0{index + 1}</span><span className={cn("size-2 rounded-full", stage.status === "ready" ? "bg-[#2DA36B]" : "bg-[#D9A342]")} /></div><div className="mt-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{stage.title}</h3><p className="mt-1 text-[11px] text-[#65786C]">{stage.subtitle}</p></div><Score score={stage.score} small /></div><div className="mt-5 flex items-center justify-between border-t border-[#E4EAE5] pt-3 text-[10px] text-[#65786C]"><span>{stage.metric}</span><span className="font-medium">{stage.duration}</span></div>{index < stages.length - 1 && <ChevronRight className="absolute -right-[19px] top-[48%] z-10 hidden size-5 rounded-full bg-[#0C211B] p-1 text-white xl:block" />}</div>)}</div>
        </section>
        <section className="grid gap-6 xl:grid-cols-[.94fr_1.06fr]">
          <div className="rounded-[28px] border border-[#E6DDBF] bg-[#FFFDF6] p-6"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#907443]">FIRST-IN, FIRST-FIX</p><h2 className="mt-2 text-xl font-semibold tracking-tight">개선 우선순위</h2></div><div className="rounded-xl bg-[#F8E8B5] p-2 text-[#7D602A]"><AlertTriangle className="size-5" /></div></div><div className="mt-5 rounded-2xl border border-[#ECDFAE] bg-white/70 p-4"><p className="text-[11px] font-bold tracking-[.12em] text-[#8B7242]">PRIORITY 01</p><div className="mt-2 flex items-center justify-between"><h3 className="text-base font-semibold">{improvement.stageTitle}</h3><span className="rounded-full bg-[#FFF0C7] px-2.5 py-1 text-xs font-bold text-[#7D602A]">{improvement.score} / {improvement.target}</span></div><p className="mt-3 text-xs leading-5 text-[#665B45]">{improvement.rationale}</p></div><div className="mt-4 space-y-2">{improvement.actions.map((action) => <div key={action} className="flex gap-2 text-xs leading-5 text-[#5D634D]"><Check className="mt-0.5 size-3.5 shrink-0 text-[#2F8C5D]" />{action}</div>)}</div></div>
          <div className="rounded-[28px] border border-[#DFE5DE] bg-white p-6"><div className="flex items-start justify-between"><div><p className="eyebrow">CORPUS SNAPSHOT</p><h2 className="mt-2 text-xl font-semibold tracking-tight">안전한 지식 기반</h2></div><span className="rounded-full bg-[#EAF6EE] px-3 py-1.5 text-[11px] font-bold text-[#1B784C]">{dashboard.data?.documentCount ?? 3} DOCUMENTS</span></div><div className="mt-7 grid grid-cols-3 divide-x divide-[#E1E8E2]"><div className="px-3 first:pl-0"><p className="text-2xl font-semibold">{dashboard.data?.documentCount ?? 3}</p><p className="mt-1 text-[10px] tracking-wide text-[#65786C]">보호 문서</p></div><div className="px-3"><p className="text-2xl font-semibold">73</p><p className="mt-1 text-[10px] tracking-wide text-[#65786C]">색인 청크</p></div><div className="px-3"><p className="text-2xl font-semibold">Top-3</p><p className="mt-1 text-[10px] tracking-wide text-[#65786C]">전달 컨텍스트</p></div></div><div className="mt-6 rounded-2xl bg-[#F3F7F4] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#244E3A]"><LockKeyhole className="size-3.5" /> 데이터 경계</div><p className="mt-2 text-[11px] leading-5 text-[#63786B]">운영 환경에서는 S3 Private Endpoint, KMS, 사내 SSO 및 온프레미스 임베딩·생성 모델을 결합하는 구조입니다. 이 화면의 문서는 합성 데모 데이터입니다.</p></div></div>
        </section>
      </div>}

      {section === "documents" && <div className="space-y-6 rise-in"><section className="flex flex-col justify-between gap-5 rounded-[28px] border border-[#DFE5DE] bg-white p-6 sm:flex-row sm:items-center"><div><p className="eyebrow">PRIVATE CORPUS</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">문서 저장소</h2><p className="mt-1 text-sm text-[#64766C]">원본은 암호화 저장하고, 검색에는 파싱된 청크와 벡터만 사용합니다.</p></div><div className="flex flex-col items-start gap-2 sm:items-end"><input ref={fileInput} type="file" className="hidden" accept=".pdf,.docx,.xlsx,.pptx" onChange={(event) => handleFile(event.target.files?.[0])} /><Button onClick={() => isAuthenticated ? fileInput.current?.click() : startLogin()} disabled={uploading} className="h-11 rounded-xl bg-[#176B48] px-4 text-xs font-bold hover:bg-[#125839]">{uploading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : isAuthenticated ? <Upload className="mr-2 size-4" /> : <LockKeyhole className="mr-2 size-4" />}{uploading ? "안전하게 색인 중" : isAuthenticated ? "보호 문서 업로드" : "로그인 후 문서 업로드"}</Button><p className="text-[10px] text-[#75857B]">{isAuthenticated ? "사용자별 S3 키 공간에 암호화 저장됩니다." : "문서 업로드와 색인은 인증 사용자만 허용됩니다."}</p></div></section><section className="overflow-x-auto rounded-[28px] border border-[#DFE5DE] bg-white"><div className="min-w-[600px]"><div className="grid grid-cols-[minmax(240px,1fr)_90px_90px_90px] border-b border-[#E6ECE7] bg-[#FAFBFA] px-6 py-3 text-[10px] font-bold tracking-[.12em] text-[#708278]"><span>DOCUMENT</span><span>CHUNKS</span><span>SCORE</span><span>STATUS</span></div>{documents.map((document) => <div key={document.id} className="grid grid-cols-[minmax(240px,1fr)_90px_90px_90px] items-center border-b border-[#EEF1EE] px-6 py-4 last:border-0"><div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF5EF] text-[#277552]"><FileText className="size-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{document.title}</p><p className="mt-0.5 text-[10px] text-[#74847B]">{document.type} · {document.size} · {document.updatedAt}</p></div></div><span className="text-xs text-[#53685B]">{document.chunks}</span><span className="text-xs font-semibold text-[#1B6C48]">{document.score}</span><span><Badge variant="secondary" className="rounded-full bg-[#EAF7EE] px-2 py-1 text-[9px] font-bold text-[#1D7B4D]">{document.status}</Badge></span></div>)}</div></section><p className="flex items-center gap-2 text-[11px] text-[#77877E]"><ShieldCheck className="size-4 text-[#2C8B5B]" /> 업로드 문서는 사용자별 키 공간에 저장됩니다. 실운영에서는 부서·등급 기반 접근통제를 추가하세요.</p></div>}

      {section === "search" && <div className="space-y-6 rise-in"><section className="rounded-[28px] bg-[#103027] p-6 text-white sm:p-8"><p className="eyebrow text-[#BDECCD]">CANDIDATE-ONLY GENERATION</p><div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="display-serif text-[34px] leading-none">사내 문서에 질문하세요.</h2><p className="mt-3 max-w-2xl text-sm text-[#C7D8CD]">키워드 일치와 의미 유사도를 결합해 근거 후보를 고르고, 그 후보만 답변 컨텍스트로 제한합니다.</p></div><div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-medium text-[#DBF3E3]"><ShieldCheck className="size-4" /> 외부 모델 전송 없음</div></div></section><section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div><AIChatBox messages={messages} onSendMessage={sendQuestion} isLoading={searchMutation.isPending} height="520px" placeholder="금융 사내 문서에 질문하기" emptyStateMessage="데모 질의 또는 직접 질문으로 검색을 시작하세요" suggestedPrompts={demoQuestions} className="overflow-hidden rounded-[28px] border-[#DFE5DE] shadow-[0_12px_28px_rgba(16,48,39,.05)]" /></div><div className="rounded-[28px] border border-[#DFE5DE] bg-white p-5"><div className="flex items-start justify-between"><div><p className="eyebrow">RETRIEVAL TRACE</p><h2 className="mt-2 text-lg font-semibold">선택 후보 근거</h2></div>{searchResult ? <span className="rounded-full bg-[#E8F5EC] px-2.5 py-1 text-[10px] font-bold text-[#1A794A]">{searchResult.timing.total}</span> : <Search className="size-5 text-[#71917F]" />}</div>{searchResult ? <div className="mt-5 space-y-3">{searchResult.candidates.map((candidate, index) => <div key={String(candidate.id)} className="rounded-2xl border border-[#E2E9E3] p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold text-[#1A573A]">0{index + 1} · {candidate.documentTitle}</p><p className="mt-1 text-[10px] text-[#6D8174]">청크 {candidate.ordinal + 1} · 후보 컨텍스트 포함</p></div><span className="rounded-lg bg-[#EFF6F0] px-2 py-1 text-[10px] font-bold text-[#176B48]">{candidate.hybridScore}</span></div><p className="mt-3 line-clamp-3 text-[11px] leading-5 text-[#52665B]">{candidate.content}</p><div className="mt-3 flex gap-2 text-[9px] font-semibold"><span className="rounded-full bg-[#F1F3F1] px-2 py-1 text-[#66766E]">BM25 {candidate.keywordScore}</span><span className="rounded-full bg-[#EAF6EF] px-2 py-1 text-[#277952]">SEM {candidate.semanticScore}</span></div></div>)}</div> : <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-[#D8E2DA] bg-[#FAFCFA] px-6 py-14 text-center"><Layers3 className="size-7 text-[#8FA697]" /><p className="mt-3 text-xs font-medium text-[#51655A]">검색을 실행하면 후보 3개를 표시합니다.</p><p className="mt-1 text-[10px] leading-5 text-[#7A8A81]">답변 모델은 이 후보 청크만 볼 수 있습니다.</p></div>}</div></section>{searchResult && <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-[#DFE5DE] bg-white p-4"><p className="eyebrow">RETRIEVAL</p><p className="mt-2 text-2xl font-semibold">{searchResult.stages.find((stage) => stage.id === "retrieve")?.score}</p><p className="mt-1 text-[11px] text-[#708278]">후보 적합도 · {searchResult.timing.retrieve}</p></div><div className="rounded-2xl border border-[#DFE5DE] bg-white p-4"><p className="eyebrow">GROUNDEDNESS</p><p className="mt-2 text-2xl font-semibold">96</p><p className="mt-1 text-[11px] text-[#708278]">후보 청크 내 근거 인용</p></div><div className="rounded-2xl border border-[#DFE5DE] bg-white p-4"><p className="eyebrow">NEXT IMPROVEMENT</p><p className="mt-2 text-sm font-semibold">{searchResult.improvement.stageTitle}</p><p className="mt-1 text-[11px] text-[#708278]">앞단 미달 단계 우선</p></div></section>}</div>}
    </div>
  </DashboardLayout>;
}
