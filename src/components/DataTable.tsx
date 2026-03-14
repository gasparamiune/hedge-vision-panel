import { AlertTriangle, Database } from "lucide-react";

interface DataTableProps {
  type: string;
  items: Record<string, unknown>[];
}

export function DataTable({ type, items }: DataTableProps) {
  if (!items || items.length === 0) return <EmptyState />;

  const columns = Object.keys(items[0]);

  return (
    <div className="w-full border border-border bg-background overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-3 px-4 border-b border-border"
              >
                {key.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={idx}
              className={`border-b border-terminal-ghost hover:bg-terminal-ghost/50 transition-colors duration-100 ${getRowHighlight(item, type)}`}
            >
              {columns.map((key) => (
                <td key={key} className="py-3 px-4 text-xs font-mono tabular-nums tracking-tight">
                  <CellRenderer column={key} value={item[key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellRenderer({ column, value }: { column: string; value: unknown }) {
  if (column.includes("score") && typeof value === "number") {
    const pct = value > 1 ? value : value * 100;
    return (
      <div className="flex items-center gap-3 min-w-[120px]">
        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-foreground" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="w-8 text-right text-muted-foreground">{pct.toFixed(0)}</span>
      </div>
    );
  }

  if (column.includes("timestamp") && typeof value === "string") {
    return <span className="text-muted-foreground">{new Date(value).toLocaleTimeString([], { hour12: false })}</span>;
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

  if (column === "action" && typeof value === "string") {
    const styles: Record<string, string> = {
      alert: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber/20",
      paper_trade: "bg-terminal-lime/10 text-terminal-lime border-terminal-lime/20",
    };
    return (
      <span
        className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-tighter rounded-sm ${
          styles[value] || "border-border"
        }`}
      >
        {value}
      </span>
    );
  }

  if (column === "status" && typeof value === "string") {
    const color = value === "completed" ? "text-terminal-lime" : value === "failed" ? "text-terminal-red" : "text-terminal-amber";
    return <span className={`${color} font-bold uppercase text-[10px] tracking-wider`}>{value}</span>;
  }

  if (column === "source_scores" && typeof value === "object" && value !== null) {
    return (
      <div className="flex gap-2 flex-wrap">
        {Object.entries(value as Record<string, number>).map(([k, v]) => (
          <span key={k} className="text-muted-foreground">
            <span className="text-foreground">{k}</span>:{typeof v === "number" ? (v * 100).toFixed(0) : String(v)}
          </span>
        ))}
      </div>
    );
  }

  return <span>{String(value ?? "—")}</span>;
}

function getRowHighlight(item: Record<string, unknown>, type: string): string {
  if (type !== "decisions") return "";
  if (item.action === "alert") return "bg-terminal-amber/5";
  if (item.action === "paper_trade") return "bg-terminal-lime/5";
  return "";
}

function EmptyState() {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
      <Database className="text-terminal-dim mb-4" size={32} />
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        No active signals found in buffer
      </p>
    </div>
  );
}
