import { RefreshCw, Terminal } from "lucide-react";
import { TAB_ORDER, TAB_LABELS, type TabKey, type AssetClassFilter } from "@/hooks/use-dashboard-data";
import { useState, useEffect } from "react";

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onRefresh: () => void;
  loading: boolean;
  assetClassFilter: AssetClassFilter;
  onAssetClassFilterChange: (f: AssetClassFilter) => void;
  lastRefreshTime: Date | null;
}

const ASSET_FILTERS: AssetClassFilter[] = ["ALL", "CRYPTO", "STOCK"];

function useRelativeTime(date: Date | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!date) return null;
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function DashboardHeader({
  activeTab, onTabChange, onRefresh, loading,
  assetClassFilter, onAssetClassFilterChange, lastRefreshTime,
}: HeaderProps) {
  const relTime = useRelativeTime(lastRefreshTime);
  const isLive = lastRefreshTime ? (Date.now() - lastRefreshTime.getTime()) < 120000 : false;

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

        <div className="flex items-center gap-6 h-full">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`h-full px-1 text-[11px] font-medium uppercase tracking-widest transition-all duration-100 ease-out border-b-2 ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Asset class filter */}
          <div className="flex items-center border border-border rounded-sm overflow-hidden">
            {ASSET_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => onAssetClassFilterChange(f)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight transition-colors ${
                  assetClassFilter === f
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isLive ? "bg-terminal-lime animate-pulse" : "bg-terminal-red"}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLive ? "text-terminal-lime" : "text-terminal-red"}`}>
              {isLive ? "LIVE" : "STALE"}
            </span>
            {relTime && <span className="text-[10px] text-muted-foreground font-mono">{relTime}</span>}
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
      </div>
    </header>
  );
}
