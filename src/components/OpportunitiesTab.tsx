import { useState } from "react";
import { ChevronDown, ChevronRight, Database } from "lucide-react";

interface OpportunitiesTabProps {
  items: Record<string, unknown>[];
}

function parseJson(value: unknown): unknown {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

const VERDICT_STYLES: Record<string, string> = {
  "STRONG BUY": "bg-terminal-lime/20 text-terminal-lime border-terminal-lime/30",
  "BUY": "bg-agent-green/20 text-agent-green border-agent-green/30",
  "WATCH": "bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30",
  "AVOID": "bg-terminal-red/20 text-terminal-red border-terminal-red/30",
};

export function OpportunitiesTab({ items }: OpportunitiesTabProps) {
  if (!items || items.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-sm">
        <Database className="text-terminal-dim mb-4" size={32} />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">No opportunities detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <OpportunityRow key={idx} item={item} />
      ))}
    </div>
  );
}

function OpportunityRow({ item }: { item: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const advice = parseJson(item.advice) as Record<string, unknown> | null;
  const sourceScores = parseJson(item.source_scores) as Record<string, unknown> | null;

  const verdict = (advice?.overall_verdict as string)?.toUpperCase() ?? "";
  const confidence = typeof advice?.confidence === "number" ? advice.confidence : null;
  const keyReasons = Array.isArray(advice?.key_reasons) ? advice.key_reasons as string[] : [];
  const riskFactors = Array.isArray(advice?.risk_factors) ? advice.risk_factors as string[] : [];
  const suggestedAction = advice?.suggested_action as string | undefined;

  const verdictStyle = VERDICT_STYLES[verdict] || "border-border text-muted-foreground";

  return (
    <div className="border border-border bg-background rounded-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-terminal-ghost/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        
        <span className="text-xs font-mono font-bold min-w-[100px]">{String(item.asset ?? "—")}</span>

        {verdict && (
          <span className={`px-2.5 py-1 border text-[11px] font-bold uppercase tracking-tight rounded-sm ${verdictStyle}`}>
            {verdict}
          </span>
        )}

        {confidence !== null && (
          <span className="text-xs font-mono text-muted-foreground">{(confidence * 100).toFixed(0)}% conf</span>
        )}

        {typeof item.combined_score === "number" && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-foreground" style={{ width: `${Math.min((item.combined_score as number) * 100, 100)}%` }} />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
              {((item.combined_score as number) * 100).toFixed(0)}
            </span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {keyReasons.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Key Reasons</p>
                <ul className="space-y-1">
                  {keyReasons.map((r, i) => (
                    <li key={i} className="text-xs font-mono text-terminal-lime flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full bg-terminal-lime shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {riskFactors.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Risk Factors</p>
                <ul className="space-y-1">
                  {riskFactors.map((r, i) => (
                    <li key={i} className="text-xs font-mono text-terminal-red flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full bg-terminal-red shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {suggestedAction && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Suggested Action</p>
              <p className="text-xs font-mono text-foreground">{suggestedAction}</p>
            </div>
          )}

          {sourceScores && typeof sourceScores === "object" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Agent Scores</p>
              <div className="space-y-1.5">
                {Object.entries(sourceScores).map(([agent, scoreData]) => {
                  let score = 0;
                  if (typeof scoreData === "number") score = scoreData;
                  else if (scoreData && typeof scoreData === "object" && "weighted_score" in (scoreData as Record<string, unknown>)) {
                    score = (scoreData as Record<string, unknown>).weighted_score as number;
                  }
                  const pct = score > 1 ? score : score * 100;
                  return (
                    <div key={agent} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-32 truncate">{agent}</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-foreground rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{pct.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
