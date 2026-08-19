import { cn } from "@/lib/utils";
import { BarChart3, Database, Search, ShieldCheck, UsersRound } from "lucide-react";

export type DashboardSection = "overview" | "documents" | "search" | "access";

const navigation: Array<{ id: DashboardSection; label: string; code: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "운영 현황", code: "01", icon: BarChart3 },
  { id: "documents", label: "문서 레지스트리", code: "02", icon: Database },
  { id: "search", label: "검색 검증", code: "03", icon: Search },
  { id: "access", label: "계정 · 권한", code: "04", icon: UsersRound },
];

export default function DashboardLayout({ children, activeSection, onNavigate }: { children: React.ReactNode; activeSection: DashboardSection; onNavigate: (section: DashboardSection) => void }) {
  return (
    <div className="min-h-screen bg-[#F4F6F6] text-[#14201E]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-[#16201E] px-5 py-6 text-[#DDE5E2] lg:flex">
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center border border-[#93C5AD]/45 bg-[#1D2D28] text-[#BDE2CC]"><ShieldCheck className="size-4" /></div>
            <div><p className="text-[10px] font-semibold tracking-[.18em] text-[#B6C6BE]">NEXUS / INTERNAL</p><p className="mt-0.5 text-sm font-semibold tracking-tight text-white">Knowledge Control</p></div>
          </div>
        </div>
        <nav className="mt-7 space-y-1">
          {navigation.map((item) => {
            const active = item.id === activeSection;
            return <button key={item.id} onClick={() => onNavigate(item.id)} className={cn("group flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors", active ? "border-[#A7D7B7] bg-white/[.075] text-white" : "border-transparent text-[#AEBDB6] hover:bg-white/[.04] hover:text-white")}>
              <span className={cn("font-mono text-[10px]", active ? "text-[#A7D7B7]" : "text-[#74847C]")}>{item.code}</span><item.icon className="size-[15px]" /><span className="text-[13px] font-medium">{item.label}</span>
            </button>;
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="text-[10px] font-semibold tracking-[.16em] text-[#82928A]">SECURITY BOUNDARY</p>
          <p className="mt-2 text-[11px] leading-5 text-[#B7C4BE]">검색 후보 외의 원문은 생성 컨텍스트에 포함하지 않습니다.</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-medium text-[#A7D7B7]"><span className="size-1.5 rounded-full bg-[#7BC796]" /> INTRANET READY</div>
        </div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#D7DFDC] bg-white/95 backdrop-blur lg:hidden">
        {navigation.map((item) => { const active = item.id === activeSection; return <button key={item.id} onClick={() => onNavigate(item.id)} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium", active ? "bg-[#182522] text-white" : "text-[#62726B]")}><item.icon className="size-4" />{item.label}</button>; })}
      </nav>
      <main className="min-h-screen pb-16 lg:pl-[244px] lg:pb-0">{children}</main>
    </div>
  );
}
