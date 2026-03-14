import type { DashboardData, TabKey } from "@/hooks/use-dashboard-data";
import { Activity, Zap, Trophy } from "lucide-react";

interface SummaryBarProps {
  data: DashboardData;
  activeTab: TabKey;
}

export function SummaryBar({ data }: SummaryBarProps) {
  const totalCycles = data.runs.length;
  const totalSignals = data.signals.length;

  // Best scoring asset from decisions
  let bestAsset = "—";
  let bestScore = 0;
  for (const d of data.decisions) {
    const score = typeof d.score === "number" ? d.score : 0;
    if (score > bestScore) {
      bestScore = score;
      bestAsset = String(d.asset ?? "—");
    }
  }

  const stats = [
    { icon: Activity, label: "CYCLES RUN", value: String(totalCycles) },
    { icon: Zap, label: "SIGNALS", value: String(totalSignals) },
    { icon: Trophy, label: "TOP ASSET", value: `${bestAsset} ${bestScore > 0 ? `(${(bestScore * 100).toFixed(0)}%)` : ""}` },
  ];

  return (
    <div className="grid grid-cols-3 gap-px bg-border border border-border mb-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-background px-5 py-3 flex items-center gap-3">
          <s.icon size={16} className="text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="text-sm font-mono font-bold tabular-nums">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
