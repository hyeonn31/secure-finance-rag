import { cn } from "@/lib/utils";
import { BarChart3, BookOpenText, Database, ShieldCheck, Sparkles } from "lucide-react";

export type DashboardSection = "overview" | "documents" | "search";

const navigation: Array<{ id: DashboardSection; label: string; detail: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "운영 개요", detail: "Pipeline health", icon: BarChart3 },
  { id: "documents", label: "문서 저장소", detail: "Private corpus", icon: Database },
  { id: "search", label: "검색 실험실", detail: "Grounded answers", icon: Sparkles },
];

export default function DashboardLayout({ children, activeSection, onNavigate }: { children: React.ReactNode; activeSection: DashboardSection; onNavigate: (section: DashboardSection) => void }) {
  return (
    <div className="min-h-screen bg-[#F6F7F5] text-[#152820]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col border-r border-[#DFE5DE] bg-[#0C211B] px-5 py-6 text-[#EAF1EB] lg:flex">
        <div className="mb-12 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#CBEEDB] text-[#0C211B] shadow-[0_12px_30px_rgba(113,194,148,.18)]"><ShieldCheck className="size-5" /></div>
          <div><p className="text-[10px] font-bold tracking-[.18em] text-[#9AB3A5]">INTERNAL ONLY</p><p className="mt-0.5 text-sm font-semibold tracking-tight">VERDE / RAG</p></div>
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const active = item.id === activeSection;
            return <button key={item.id} onClick={() => onNavigate(item.id)} className={cn("group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200", active ? "bg-[#1F4035] text-white shadow-[0_10px_22px_rgba(0,0,0,.12)]" : "text-[#ADC2B4] hover:bg-white/5 hover:text-white")}>
              <item.icon className={cn("size-[18px]", active && "text-[#AFEAC6]")} />
              <span><span className="block text-sm font-medium">{item.label}</span><span className="mt-0.5 block text-[10px] tracking-wide opacity-60">{item.detail}</span></span>
            </button>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.045] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#CBEEDB]"><BookOpenText className="size-4" /> 보호된 컨텍스트</div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#A6BCAE]">전체 문서는 모델에 전달하지 않습니다. 검색된 후보 청크만 사내 모델 컨텍스트로 제한합니다.</p>
        </div>
      </aside>
      <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-2xl border border-[#D7E4DA] bg-white/95 p-1.5 shadow-[0_16px_38px_rgba(16,48,39,.16)] backdrop-blur lg:hidden">
        {navigation.map((item) => {
          const active = item.id === activeSection;
          return <button key={item.id} onClick={() => onNavigate(item.id)} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-semibold transition-colors", active ? "bg-[#0C211B] text-white" : "text-[#6B8174]")}><item.icon className="size-4" /><span className="truncate">{item.label}</span></button>;
        })}
      </nav>
      <main className="min-h-screen lg:pl-[268px]">{children}</main>
    </div>
  );
}
