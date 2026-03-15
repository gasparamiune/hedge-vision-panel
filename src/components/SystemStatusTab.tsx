import { Database, Activity } from "lucide-react";

interface SystemStatusTabProps {
  items: Record<string, unknown>[];
}

export function SystemStatusTab({ items }: SystemStatusTabProps) {
  if (!items || items.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
        <Database className="text-terminal-dim mb-4" size={32} />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">No run data available</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) =>
    new Date(String(b.completed_at ?? b.created_at ?? 0)).getTime() - new Date(String(a.completed_at ?? a.created_at ?? 0)).getTime()
  );

  const lastRun = sorted[0];
  const lastRunTime = new Date(String(lastRun?.completed_at ?? lastRun?.created_at ?? 0));
  const isLive = (Date.now() - lastRunTime.getTime()) < 120000;

  const avgSignals = items.reduce((s, i) => s + (Number(i.signal_count) || 0), 0) / items.length;
  const avgOpps = items.reduce((s, i) => s + (Number(i.opportunity_count) || 0), 0) / items.length;

  const last20 = sorted.slice(0, 20).reverse();
  const maxOpp = Math.max(...last20.map((i) => Number(i.opportunity_count) || 0), 1);

  return (
    <div className="space-y-6">
      {/* Status + metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border bg-terminal-ghost/50 p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? "bg-terminal-lime animate-pulse" : "bg-terminal-red"}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isLive ? "text-terminal-lime" : "text-terminal-red"}`}>
              {isLive ? "SYSTEM LIVE" : "SYSTEM STALE"}
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">
            Last run: {lastRunTime.toLocaleString([], { hour12: false })}
          </p>
        </div>
        <div className="border border-border bg-terminal-ghost/50 p-4 rounded-sm">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Avg Signals / Cycle</p>
          <p className="text-2xl font-mono font-bold text-foreground">{avgSignals.toFixed(1)}</p>
        </div>
        <div className="border border-border bg-terminal-ghost/50 p-4 rounded-sm">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Avg Opportunities / Cycle</p>
          <p className="text-2xl font-mono font-bold text-foreground">{avgOpps.toFixed(1)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="border border-border bg-terminal-ghost/50 p-4 rounded-sm">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Opportunities per Cycle (last 20)</p>
        </div>
        <div className="flex items-end gap-1 h-24">
          {last20.map((run, idx) => {
            const val = Number(run.opportunity_count) || 0;
            const height = (val / maxOpp) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1" title={`${val} opportunities`}>
                <span className="text-[9px] font-mono text-muted-foreground">{val}</span>
                <div className="w-full bg-foreground/80 rounded-t-sm" style={{ height: `${Math.max(height, 2)}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent runs table */}
      <div className="w-full border border-border bg-background overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Status", "Signals", "Opportunities", "Duration", "Completed At"].map((h) => (
                <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-3 px-4 border-b border-border">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 20).map((run, idx) => {
              const status = String(run.status ?? "—").toLowerCase();
              const statusColor = status === "completed" ? "text-terminal-lime" : status === "failed" ? "text-terminal-red" : "text-terminal-amber";
              return (
                <tr key={idx} className="border-b border-terminal-ghost hover:bg-terminal-ghost/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`${statusColor} font-bold uppercase text-[10px] tracking-wider`}>{status}</span>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono">{String(run.signal_count ?? "—")}</td>
                  <td className="py-3 px-4 text-xs font-mono">{String(run.opportunity_count ?? "—")}</td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{String(run.duration_seconds ?? run.duration ?? "—")}s</td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                    {run.completed_at ? new Date(String(run.completed_at)).toLocaleString([], { hour12: false }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
