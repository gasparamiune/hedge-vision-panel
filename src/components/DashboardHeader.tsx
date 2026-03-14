import { useState, useEffect } from "react";
import { RefreshCw, Terminal } from "lucide-react";
import type { TabKey } from "@/hooks/use-dashboard-data";

const TABS: TabKey[] = ["decisions", "opportunities", "signals", "runs"];

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onRefresh: () => void;
  loading: boolean;
  lastRefresh: Date | null;
}

function LiveIndicator({ lastRefresh }: { lastRefresh: Date | null }) {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!lastRefresh) { setIsLive(false); return; }
      setIsLive(Date.now() - lastRefresh.getTime() < 120_000);
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [lastRefresh]);

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${isLive ? "bg-terminal-lime animate-[pulse_2s_ease-in-out_infinite]" : "bg-terminal-red"}`} />
      <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isLive ? "text-terminal-lime" : "text-terminal-red"}`}>
        {isLive ? "LIVE" : "STALE"}
      </span>
    </div>
  );
}

export function DashboardHeader({ activeTab, onTabChange, onRefresh, loading, lastRefresh }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-foreground flex items-center justify-center rounded-sm">
            <Terminal size={18} className="text-background" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase">Hedge Agents</h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              v2.4.0 // Terminal
            </p>
          </div>
          <LiveIndicator lastRefresh={lastRefresh} />
        </div>

        <div className="flex items-center gap-8 h-full">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`h-full px-1 text-[13px] font-medium uppercase tracking-widest transition-all duration-100 ease-out border-b-2 ${
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
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm hover:bg-secondary transition-all duration-100 ease-out animate-[pulse_3s_ease-in-out_infinite] hover:animate-none"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span className="text-[11px] font-bold uppercase tracking-tight">Refresh</span>
        </button>
      </div>
    </header>
  );
}
