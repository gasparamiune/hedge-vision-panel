import { useState } from "react";
import { AlertTriangle, Database } from "lucide-react";

interface DataTableProps {
  type: string;
  items: Record<string, unknown>[];
}

const AGENT_COLORS: Record<string, string> = {
  momentum_breakout: "bg-terminal-lime",
  wallet_flow: "bg-terminal-lime",
  news_narrative: "bg-blue-500",
  microcap_breakout: "bg-orange-500",
  polymarket_edge: "bg-purple-500",
  market_snapshot: "bg-zinc-500",
};

type FilterType = "all" | "alert" | "paper_trade" | "ignore";

export function DataTable({ type, items }: DataTableProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  if (!items || items.length === 0) return <EmptyState />;

  const filteredItems = type === "decisions" && filter !== "all"
    ? items.filter((item) => item.action === filter)
    : items;

  const columns = Object.keys(items[0]);

  // Find top opportunity index
  let topOpportunityIdx = -1;
  if (type === "opportunities") {
    let maxScore = -1;
    filteredItems.forEach((item, idx) => {
      const s = typeof item.final_score === "number" ? item.final_score : 0;
      if (s > maxScore) { maxScore = s; topOpportunityIdx = idx; }
    });
  }

  return (
    <div>
      {type === "decisions" && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mr-2">Filter:</span>
          {(["all", "alert", "paper_trade", "ignore"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-tight border rounded-sm transition-all duration-100 ${
                filter === f
                  ? "border-foreground text-foreground bg-secondary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {f === "all" ? "All" : f === "paper_trade" ? "Paper Trade" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="w-full border border-border bg-background overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((key) => (
                <th
                  key={key}
                  className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-3.5 px-5 border-b border-border"
                >
                  {key.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const isTopOpp = type === "opportunities" && idx === topOpportunityIdx;
              return (
                <tr
                  key={idx}
                  className={`border-b border-terminal-ghost hover:bg-terminal-ghost/50 transition-colors duration-100 ${getRowStyles(item, type)} ${isTopOpp ? "ring-1 ring-yellow-500/40" : ""}`}
                >
                  {columns.map((key) => (
                    <td key={key} className="py-3.5 px-5 text-[13px] font-mono tabular-nums tracking-tight">
                      <CellRenderer column={key} value={item[key]} type={type} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CellRenderer({ column, value, type }: { column: string; value: unknown; type: string }) {
  // Score as progress bar + percentage + flame
  if (column.includes("score") && typeof value === "number") {
    const pct = value > 1 ? value : value * 100;
    const isHigh = pct >= 70;
    return (
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isHigh ? "bg-terminal-lime" : "bg-foreground"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className="w-12 text-right text-muted-foreground">
          {pct.toFixed(0)}%{isHigh && " 🔥"}
        </span>
      </div>
    );
  }

  if (column.includes("timestamp") && typeof value === "string") {
    return <span className="text-muted-foreground">{new Date(value).toLocaleTimeString([], { hour12: false })}</span>;
  }

  if (column === "risk_flag") {
    return value ? (
      <span className="flex items-center gap-1 text-terminal-red font-bold">
        <AlertTriangle size={13} /> HIGH
      </span>
    ) : (
      <span className="text-terminal-dim">None</span>
    );
  }

  if (column === "action" && typeof value === "string") {
    const styles: Record<string, string> = {
      alert: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber/20",
      paper_trade: "bg-terminal-lime/10 text-terminal-lime border-terminal-lime/20",
    };
    return (
      <span
        className={`px-2.5 py-0.5 border text-[10px] font-bold uppercase tracking-tighter rounded-sm ${
          styles[value] || "border-border text-muted-foreground"
        }`}
      >
        {value === "paper_trade" ? "PAPER TRADE" : value.toUpperCase()}
      </span>
    );
  }

  if (column === "status" && typeof value === "string") {
    const color = value === "completed" ? "text-terminal-lime" : value === "failed" ? "text-terminal-red" : "text-terminal-amber";
    return <span className={`${color} font-bold uppercase text-[11px] tracking-wider`}>{value}</span>;
  }

  // Source scores as agent badges
  if (column === "source_scores" && typeof value === "object" && value !== null) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(value as Record<string, number>).map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary border border-border rounded-sm text-[10px] font-mono"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${AGENT_COLORS[k] || "bg-zinc-500"}`} />
            <span className="text-muted-foreground">{k.split("_").map(w => w[0]).join("").toUpperCase()}</span>
            <span className="text-foreground font-bold">{typeof v === "number" ? (v * 100).toFixed(0) : String(v)}</span>
          </span>
        ))}
      </div>
    );
  }

  // Agent name with colored dot (Signals tab)
  if (column === "agent_name" && type === "signals" && typeof value === "string") {
    const dotColor = AGENT_COLORS[value] || "bg-zinc-500";
    return (
      <span className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span>{value}</span>
      </span>
    );
  }

  // Opportunity count as mini bar (Runs tab)
  if (column === "opportunity_count" && type === "runs" && typeof value === "number") {
    const maxWidth = 80;
    const barW = Math.max(4, Math.min(value * 8, maxWidth));
    return (
      <div className="flex items-center gap-3">
        <div className="h-4 bg-terminal-lime/20 rounded-sm" style={{ width: barW }}>
          <div className="h-full bg-terminal-lime/60 rounded-sm" style={{ width: "100%" }} />
        </div>
        <span>{value}</span>
      </div>
    );
  }

  return <span>{String(value ?? "—")}</span>;
}

function getRowStyles(item: Record<string, unknown>, type: string): string {
  if (type !== "decisions") return "";
  if (item.action === "alert")
    return "border-l-2 border-l-terminal-amber shadow-[inset_4px_0_12px_-4px_hsl(var(--terminal-amber)/0.15)]";
  if (item.action === "paper_trade")
    return "border-l-2 border-l-terminal-lime shadow-[inset_4px_0_12px_-4px_hsl(var(--terminal-lime)/0.15)]";
  return "";
}

function EmptyState() {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
      <Database className="text-terminal-dim mb-4" size={32} />
      <p className="text-[13px] font-mono text-muted-foreground uppercase tracking-widest">
        No active signals found in buffer
      </p>
    </div>
  );
}
