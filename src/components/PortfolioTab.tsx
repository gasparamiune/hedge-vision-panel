import { Database, TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioTabProps {
  items: Record<string, unknown>[];
}

function calcPnl(entry: number, current: number): number {
  if (!entry) return 0;
  return ((current - entry) / entry) * 100;
}

export function PortfolioTab({ items }: PortfolioTabProps) {
  if (!items || items.length === 0) return <EmptyPortfolio />;

  const openPositions = items.filter((i) => (i.status as string)?.toUpperCase() === "OPEN");
  const withPnl = items.map((i) => ({
    ...i,
    pnl: calcPnl(Number(i.entry_price) || 0, Number(i.current_price) || 0),
  }));
  const best = withPnl.reduce((a, b) => (a.pnl > b.pnl ? a : b), withPnl[0]);
  const worst = withPnl.reduce((a, b) => (a.pnl < b.pnl ? a : b), withPnl[0]);
  const totalPnl = openPositions.length > 0
    ? withPnl.filter((i) => (i.status as string)?.toUpperCase() === "OPEN").reduce((s, i) => s + i.pnl, 0) / openPositions.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Open Positions" value={String(openPositions.length)} />
        <StatCard label="Best Performer" value={`${String(best?.asset ?? "—")} ${best?.pnl?.toFixed(1)}%`} positive />
        <StatCard label="Worst Performer" value={`${String(worst?.asset ?? "—")} ${worst?.pnl?.toFixed(1)}%`} negative />
        <StatCard label="Avg Open P&L" value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`} positive={totalPnl >= 0} negative={totalPnl < 0} />
      </div>

      <div className="w-full border border-border bg-background overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Asset", "Class", "Entry Price", "Current Price", "P&L %", "Status", "Entry Time"].map((h) => (
                <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-3 px-4 border-b border-border">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withPnl.map((item, idx) => (
              <tr key={idx} className="border-b border-terminal-ghost hover:bg-terminal-ghost/50 transition-colors">
                <td className="py-3 px-4 text-xs font-mono font-bold">{String(item.asset ?? "—")}</td>
                <td className="py-3 px-4">
                  <AssetClassBadge value={String(item.asset_class ?? "")} />
                </td>
                <td className="py-3 px-4 text-xs font-mono tabular-nums">${Number(item.entry_price).toFixed(2)}</td>
                <td className="py-3 px-4 text-xs font-mono tabular-nums">${Number(item.current_price).toFixed(2)}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-mono font-bold ${item.pnl >= 0 ? "text-terminal-lime" : "text-terminal-red"}`}>
                    {item.pnl >= 0 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
                    {item.pnl >= 0 ? "+" : ""}{item.pnl.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-tighter rounded-sm ${
                    (item.status as string)?.toUpperCase() === "OPEN"
                      ? "bg-terminal-lime/10 text-terminal-lime border-terminal-lime/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {String(item.status ?? "—")}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                  {item.entry_time ? new Date(String(item.entry_time)).toLocaleString([], { hour12: false }) : item.created_at ? new Date(String(item.created_at)).toLocaleString([], { hour12: false }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssetClassBadge({ value }: { value: string }) {
  const upper = value?.toUpperCase();
  const styles = upper === "CRYPTO"
    ? "bg-agent-purple/10 text-agent-purple border-agent-purple/20"
    : "bg-agent-blue/10 text-agent-blue border-agent-blue/20";
  return <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-tighter rounded-sm ${styles}`}>{upper || "—"}</span>;
}

function StatCard({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="border border-border bg-terminal-ghost/50 p-3 rounded-sm">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-mono font-bold ${positive ? "text-terminal-lime" : negative ? "text-terminal-red" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyPortfolio() {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
      <Database className="text-terminal-dim mb-4" size={32} />
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        No positions open — waiting for high-conviction signals
      </p>
    </div>
  );
}
