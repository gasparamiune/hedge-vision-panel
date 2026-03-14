import { RefreshCw, Terminal } from "lucide-react";
import type { TabKey } from "@/hooks/use-dashboard-data";

const TABS: TabKey[] = ["decisions", "opportunities", "signals", "runs"];

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function DashboardHeader({ activeTab, onTabChange, onRefresh, loading }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground flex items-center justify-center rounded-sm">
            <Terminal size={18} className="text-background" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase">Hedge Agents</h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              v2.4.0 // Terminal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 h-full">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`h-full px-1 text-xs font-medium uppercase tracking-widest transition-all duration-100 ease-out border-b-2 ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-sm hover:bg-secondary transition-all duration-100 ease-out"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span className="text-[11px] font-bold uppercase tracking-tight">Refresh</span>
        </button>
      </div>
    </header>
  );
}
