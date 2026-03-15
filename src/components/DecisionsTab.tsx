import { FileDown, Database, AlertTriangle } from "lucide-react";

interface DecisionsTabProps {
  items: Record<string, unknown>[];
}

function parseJson(value: unknown): unknown {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export function DecisionsTab({ items }: DecisionsTabProps) {
  if (!items || items.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
        <Database className="text-terminal-dim mb-4" size={32} />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">No decisions recorded</p>
      </div>
    );
  }

  const columns = ["asset", "action", "agent_count", "combined_score", "risk_flag", "source_scores", "signals_json", "created_at"];
  const availableCols = columns.filter((c) => items.some((i) => i[c] !== undefined));

  return (
    <div className="w-full border border-border bg-background overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {availableCols.map((h) => (
              <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-3 px-4 border-b border-border">
                {h.replace(/_/g, " ")}
              </th>
            ))}
            <th className="py-3 px-4 border-b border-border w-10" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const action = String(item.action ?? "").toLowerCase();
            const rowBg = action === "alert"
              ? "bg-terminal-amber/5"
              : action === "paper_trade"
                ? "bg-terminal-lime/5"
                : "";

            return (
              <tr key={idx} className={`border-b border-terminal-ghost hover:bg-terminal-ghost/50 transition-colors ${rowBg}`}>
                {availableCols.map((col) => (
                  <td key={col} className="py-3 px-4 text-xs font-mono tabular-nums tracking-tight">
                    <CellRenderer column={col} value={item[col]} />
                  </td>
                ))}
                <td className="py-3 px-4">
                  {(action === "alert" || action === "paper_trade") && (
                    <button
                      onClick={() => {
                        const asset = String(item.asset ?? "");
                        const ts = String(item.created_at ?? item.timestamp ?? "");
                        const url = `https://oanaswbwlxryhrttyfyv.supabase.co/storage/v1/object/public/reports/${asset}_${action}_${ts}.pdf`;
                        window.open(url, "_blank");
                      }}
                      className="p-1 hover:bg-secondary rounded-sm transition-colors"
                      title="Download PDF report"
                    >
                      <FileDown size={14} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CellRenderer({ column, value }: { column: string; value: unknown }) {
  if (column === "action" && typeof value === "string") {
    const styles: Record<string, string> = {
      alert: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber/20",
      paper_trade: "bg-terminal-lime/10 text-terminal-lime border-terminal-lime/20",
    };
    return (
      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-tighter rounded-sm ${styles[value] || "border-border"}`}>
        {value}
      </span>
    );
  }

  if (column === "agent_count") {
    return (
      <span className="px-2 py-0.5 border border-border bg-secondary text-[10px] font-bold rounded-sm">
        {String(value ?? "0")} agents
      </span>
    );
  }

  if (column === "risk_flag") {
    return value ? (
      <span className="flex items-center gap-1 text-terminal-red font-bold">
        <AlertTriangle size={12} /> HIGH
      </span>
    ) : (
      <span className="text-terminal-dim">None</span>
    );
  }

  if (column === "combined_score" && typeof value === "number") {
    const pct = value > 1 ? value : value * 100;
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-foreground" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="text-muted-foreground">{pct.toFixed(0)}</span>
      </div>
    );
  }

  if (column === "source_scores") {
    const parsed = parseJson(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return (
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(parsed as Record<string, unknown>).map(([agent, scoreData]) => {
            let score: number | null = null;
            if (typeof scoreData === "number") score = scoreData;
            else if (scoreData && typeof scoreData === "object" && "weighted_score" in (scoreData as Record<string, unknown>)) {
              score = (scoreData as Record<string, unknown>).weighted_score as number;
            }
            return (
              <span key={agent} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-secondary text-[10px]">
                <span className="text-foreground font-medium">{agent}</span>
                {score !== null && <span className="text-muted-foreground">{(score > 1 ? score : score * 100).toFixed(0)}</span>}
              </span>
            );
          })}
        </div>
      );
    }
  }

  if (column === "signals_json") {
    const parsed = parseJson(value);
    if (Array.isArray(parsed)) return <span className="text-muted-foreground">{parsed.length} signal{parsed.length !== 1 ? "s" : ""}</span>;
    if (parsed && typeof parsed === "object") {
      const count = Object.keys(parsed).length;
      return <span className="text-muted-foreground">{count} signal{count !== 1 ? "s" : ""}</span>;
    }
  }

  if (column === "created_at" && typeof value === "string") {
    return <span className="text-muted-foreground">{new Date(value).toLocaleTimeString([], { hour12: false })}</span>;
  }

  return <span>{String(value ?? "—")}</span>;
}
