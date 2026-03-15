import { useState } from "react";
import { ChevronDown, ChevronRight, Database } from "lucide-react";

interface SignalsTabProps {
  items: Record<string, unknown>[];
}

const AGENT_COLORS: Record<string, string> = {
  momentum_breakout: "bg-agent-green",
  wallet_flow: "bg-agent-cyan",
  news_narrative: "bg-agent-blue",
  stock_momentum: "bg-agent-orange",
  stock_news: "bg-agent-yellow",
  polymarket_edge: "bg-agent-purple",
  market_snapshot: "bg-agent-gray",
};

function parseJson(value: unknown): unknown {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export function SignalsTab({ items }: SignalsTabProps) {
  if (!items || items.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
        <Database className="text-terminal-dim mb-4" size={32} />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">No signals in buffer</p>
      </div>
    );
  }

  return (
    <div className="w-full border border-border bg-background overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Agent", "Asset", "Signal", "Score", "Direction", "Time", ""].map((h) => (
              <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-3 px-4 border-b border-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <SignalRow key={idx} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignalRow({ item }: { item: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const metadata = parseJson(item.metadata_json) as Record<string, unknown> | null;
  const reasoning = metadata?.reasoning as string | undefined;
  const agentName = String(item.agent_name ?? item.agent ?? "—");
  const dotColor = AGENT_COLORS[agentName] || "bg-muted-foreground";

  const score = typeof item.score === "number" ? item.score : null;
  const pct = score !== null ? (score > 1 ? score : score * 100) : null;

  return (
    <>
      <tr
        className="border-b border-terminal-ghost hover:bg-terminal-ghost/50 transition-colors cursor-pointer"
        onClick={() => reasoning && setExpanded(!expanded)}
      >
        <td className="py-3 px-4 text-xs font-mono">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
            {agentName}
          </span>
        </td>
        <td className="py-3 px-4 text-xs font-mono font-bold">{String(item.asset ?? "—")}</td>
        <td className="py-3 px-4 text-xs font-mono">{String(item.signal_type ?? item.signal ?? "—")}</td>
        <td className="py-3 px-4">
          {pct !== null ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-foreground" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">{pct.toFixed(0)}</span>
            </div>
          ) : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="py-3 px-4">
          {item.direction && (
            <span className={`text-[10px] font-bold uppercase ${
              (item.direction as string) === "bullish" ? "text-terminal-lime" : "text-terminal-red"
            }`}>
              {String(item.direction)}
            </span>
          )}
        </td>
        <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
          {item.created_at ? new Date(String(item.created_at)).toLocaleTimeString([], { hour12: false }) : "—"}
        </td>
        <td className="py-3 px-4">
          {reasoning && (expanded
            ? <ChevronDown size={12} className="text-muted-foreground" />
            : <ChevronRight size={12} className="text-muted-foreground" />
          )}
        </td>
      </tr>
      {expanded && reasoning && (
        <tr className="border-b border-terminal-ghost">
          <td colSpan={7} className="px-4 py-3 bg-terminal-ghost/30">
            <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{reasoning}</p>
          </td>
        </tr>
      )}
    </>
  );
}
