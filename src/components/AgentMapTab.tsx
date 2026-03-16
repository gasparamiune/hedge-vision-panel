import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface AgentNode {
  id: string;
  label: string;
  color: string;
  angle: number; // degrees around the circle
}

const AGENTS: AgentNode[] = [
  { id: "market_ingestion", label: "MARKET INGESTION", color: "var(--agent-gray)", angle: 225 },
  { id: "microcap_discovery", label: "MICROCAP DISCOVERY", color: "hsl(25 95% 53%)", angle: 180 },
  { id: "momentum_breakout", label: "MOMENTUM BREAKOUT", color: "var(--agent-green)", angle: 135 },
  { id: "news_narrative", label: "NEWS NARRATIVE", color: "var(--agent-blue)", angle: 90 },
  { id: "wallet_flow", label: "WALLET FLOW", color: "var(--agent-cyan)", angle: 45 },
  { id: "polymarket_edge", label: "POLYMARKET EDGE", color: "var(--agent-purple)", angle: 0 },
  { id: "stock_momentum", label: "STOCK MOMENTUM", color: "hsl(var(--terminal-amber))", angle: 315 },
  { id: "stock_news", label: "STOCK NEWS", color: "var(--agent-yellow)", angle: 270 },
];

const AGENT_DESCRIPTIONS: Record<string, string> = {
  market_ingestion:   "Ingests real-time OHLCV and order-book snapshots across crypto and equity feeds. Normalises data into a unified market structure before distribution.",
  microcap_discovery: "Scans micro-cap tokens below $50M market cap for anomalous volume spikes, wallet concentration shifts, and early accumulation patterns.",
  momentum_breakout:  "Detects technical breakouts from consolidation ranges using ATR-normalised momentum. Fires when price and volume confirm a trend initiation.",
  news_narrative:     "Parses news headlines, social feeds, and earnings transcripts using an LLM classifier to score narrative sentiment and topic relevance.",
  wallet_flow:        "Tracks on-chain wallet flows, exchange inflows/outflows, and whale wallet activity to surface capital rotation signals.",
  polymarket_edge:    "Monitors prediction-market probabilities on Polymarket for events correlated with asset price moves, acting on divergences from spot pricing.",
  stock_momentum:     "Applies cross-sectional momentum ranking to equities, identifying sector rotation and relative-strength leaders.",
  stock_news:         "Specialised news agent for equities. Prioritises earnings surprises, analyst upgrades, and macro event risk headlines.",
};

interface SignalData {
  agent_name?: string;
  signal_type?: string;
  asset?: string;
  score?: number;
  created_at?: string;
}

interface DecisionData {
  action?: string;
  asset?: string;
  score?: number;
  thesis?: string;
  created_at?: string;
  metadata_json?: { agent_count?: number };
}

interface ActiveAgent {
  id: string;
  asset: string;
  score: number;
  expiry: number;
}

interface CenterPulse {
  type: "alert" | "paper_trade" | "agreement";
  expiry: number;
}

export function AgentMapTab() {
  const [activeAgents, setActiveAgents] = useState<Map<string, ActiveAgent>>(new Map());
  const [lastSignals, setLastSignals] = useState<Map<string, { asset: string; score: number }>>(new Map());
  const [centerPulse, setCenterPulse] = useState<CenterPulse | null>(null);
  const [highestScore, setHighestScore] = useState<number>(0);
  const [recentDecisions, setRecentDecisions] = useState<DecisionData[]>([]);
  const [debugInfo, setDebugInfo] = useState({ lastFetch: "", signalCount: 0, decisionCount: 0, error: "" });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [signalHistory, setSignalHistory] = useState<Map<string, SignalData[]>>(new Map());
  const animFrameRef = useRef<number>(0);

  const normalizeAgentName = (name: string): string => {
    return name?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  };

  const normalizeToId = (name: string): string | undefined => {
    const normalized = normalizeAgentName(name);
    const exact = AGENTS.find((a) => a.id === normalized);
    if (exact) return exact.id;
    const partial = AGENTS.find((a) => normalized.includes(a.id) || a.id.includes(normalized));
    if (partial) return partial.id;
    const keywords: Record<string, string> = {
      market: "market_ingestion", ingestion: "market_ingestion", snapshot: "market_ingestion",
      microcap: "microcap_discovery", discovery: "microcap_discovery",
      momentum_breakout: "momentum_breakout", "momentum breakout": "momentum_breakout",
      news_narrative: "news_narrative", "news narrative": "news_narrative",
      wallet: "wallet_flow", flow: "wallet_flow",
      polymarket: "polymarket_edge",
      stock_momentum: "stock_momentum",
      stock_news: "stock_news",
    };
    for (const [key, id] of Object.entries(keywords)) {
      if (normalized.includes(key)) return id;
    }
    return undefined;
  };

  const processSignals = useCallback((signals: SignalData[]) => {
    const now = Date.now();
    const newLastSignals = new Map<string, { asset: string; score: number }>();
    const newActive = new Map<string, ActiveAgent>();
    const assetAgents: Record<string, string[]> = {};

    const latestByAgent = new Map<string, SignalData>();
    signals.forEach((sig) => {
      const agentId = normalizeToId(sig.agent_name ?? "") ?? normalizeToId(sig.signal_type ?? "");
      if (!agentId) return;
      const existing = latestByAgent.get(agentId);
      if (!existing || (sig.created_at ?? "") > (existing.created_at ?? "")) {
        latestByAgent.set(agentId, sig);
      }
    });

    latestByAgent.forEach((sig, agentId) => {
      const score = sig.score ?? 0;
      const asset = sig.asset ?? "???";
      newLastSignals.set(agentId, { asset, score });

      if (score > 0.1) {
        newActive.set(agentId, { id: agentId, asset, score, expiry: now + 120000 });
        if (!assetAgents[asset]) assetAgents[asset] = [];
        assetAgents[asset].push(agentId);
      }
    });

    Object.values(assetAgents).forEach((agents) => {
      if (agents.length >= 3) {
        setCenterPulse({ type: "agreement", expiry: Date.now() + 3000 });
      }
    });

    setLastSignals(newLastSignals);
    setActiveAgents(newActive);

    const maxScore = signals.reduce((max, s) => Math.max(max, s.score ?? 0), 0);
    if (maxScore > 0) setHighestScore(maxScore);

    setSignalHistory(prev => {
      const next = new Map(prev);
      latestByAgent.forEach((sig, agentId) => {
        const existing = next.get(agentId) ?? [];
        next.set(agentId, [sig, ...existing].slice(0, 5));
      });
      return next;
    });
  }, []);

  const processDecisions = useCallback((decisions: DecisionData[]) => {
    if (decisions.length === 0) return;
    setRecentDecisions((prev) => [...decisions, ...prev].slice(0, 5));

    const latest = decisions[0];
    if (latest?.action === "alert") {
      setCenterPulse({ type: "alert", expiry: Date.now() + 3000 });
    } else if (latest?.action === "paper_trade") {
      setCenterPulse({ type: "paper_trade", expiry: Date.now() + 3000 });
    }

    const maxScore = decisions.reduce((max, d) => Math.max(max, d.score ?? 0), 0);
    if (maxScore > 0) setHighestScore(maxScore);
  }, []);

  // Poll Supabase
  useEffect(() => {
    const poll = async () => {
      try {
        const [{ data: signals, error: sigErr }, { data: decisions, error: decErr }] = await Promise.all([
          supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(100),
          supabase.from("decisions").select("*").order("created_at", { ascending: false }).limit(100),
        ]);
        if (sigErr) throw new Error(sigErr.message);
        if (decErr) throw new Error(decErr.message);
        const sc = signals?.length ?? 0;
        const dc = decisions?.length ?? 0;
        if (sc > 0) processSignals(signals as SignalData[]);
        if (dc > 0) processDecisions(decisions as DecisionData[]);
        setDebugInfo({ lastFetch: new Date().toLocaleTimeString(), signalCount: sc, decisionCount: dc, error: "" });
      } catch (e: any) {
        setDebugInfo((prev) => ({ ...prev, error: e?.message ?? "fetch failed", lastFetch: new Date().toLocaleTimeString() }));
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [processSignals, processDecisions]);

  // Animate cleanup for expired states
  useEffect(() => {
    let lastTime = performance.now();
    const tick = (time: number) => {
      lastTime = time;
      const now = Date.now();

      setActiveAgents((prev) => {
        const next = new Map(prev);
        let changed = false;
        next.forEach((v, k) => {
          if (v.expiry < now) { next.delete(k); changed = true; }
        });
        return changed ? next : prev;
      });

      setCenterPulse((prev) => (prev && prev.expiry < now ? null : prev));

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Layout calculations
  const cx = 400;
  const cy = 300;
  const radius = 220;

  const getNodePos = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  };

  const centerColor = centerPulse
    ? centerPulse.type === "alert"
      ? "hsl(var(--terminal-amber))"
      : centerPulse.type === "paper_trade"
        ? "hsl(var(--terminal-lime))"
        : "hsl(var(--terminal-lime))"
    : "hsl(var(--foreground) / 0.6)";

  const centerGlow = centerPulse
    ? centerPulse.type === "alert"
      ? "0 0 40px hsl(var(--terminal-amber) / 0.6), 0 0 80px hsl(var(--terminal-amber) / 0.3)"
      : "0 0 40px hsl(var(--terminal-lime) / 0.6), 0 0 80px hsl(var(--terminal-lime) / 0.3)"
    : "none";

  return (
    <div className="space-y-6">
      {/* SVG Canvas */}
      <div className="relative rounded-lg border border-border overflow-hidden" style={{ background: "hsl(220 30% 8%)" }}>
        {/* Debug panel */}
        <div className="absolute top-2 right-2 z-10 bg-black/80 border border-border rounded px-3 py-2 font-mono text-[10px] space-y-0.5" style={{ minWidth: 180 }}>
          <div className="text-muted-foreground">LAST FETCH: <span className="text-foreground">{debugInfo.lastFetch || "—"}</span></div>
          <div className="text-muted-foreground">SIGNALS: <span className="text-foreground">{debugInfo.signalCount}</span></div>
          <div className="text-muted-foreground">DECISIONS: <span className="text-foreground">{debugInfo.decisionCount}</span></div>
          {debugInfo.error && <div className="text-destructive">ERR: {debugInfo.error}</div>}
        </div>

        <style>{`
          @keyframes sweep-inward {
            from { stroke-dashoffset: 220; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>

        <svg viewBox="0 0 800 600" className="w-full" style={{ maxHeight: "65vh" }}>
          <defs>
            {AGENTS.map((agent) => (
              <filter key={`glow-${agent.id}`} id={`glow-${agent.id}`}>
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            <filter id="glow-center">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection lines — two-layer sweep system */}
          {AGENTS.map((agent) => {
            const pos = getNodePos(agent.angle);
            const isActive = activeAgents.has(agent.id);
            return (
              <g key={`line-${agent.id}`}>
                {/* Dim base — always visible */}
                <line x1={pos.x} y1={pos.y} x2={cx} y2={cy}
                  stroke="hsl(220 20% 20%)" strokeWidth={0.8} opacity={0.3} />
                {/* Bright sweep — only when active */}
                {isActive && (
                  <line x1={pos.x} y1={pos.y} x2={cx} y2={cy}
                    stroke={agent.color} strokeWidth={2.5} strokeLinecap="round"
                    strokeDasharray="220 220" opacity={0.9}
                    style={{ animation: "sweep-inward 1.2s linear infinite" }} />
                )}
              </g>
            );
          })}

          {/* Center node */}
          <g>
            {centerPulse && (
              <circle
                cx={cx}
                cy={cy}
                r={55}
                fill="none"
                stroke={centerColor}
                strokeWidth={2}
                opacity={0.4}
              >
                <animate attributeName="r" from="55" to="80" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            {centerPulse?.type === "paper_trade" && (
              <>
                <circle cx={cx} cy={cy} r={55} fill="none" stroke={centerColor} strokeWidth={1} opacity={0.3}>
                  <animate attributeName="r" from="55" to="100" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={55} fill="none" stroke={centerColor} strokeWidth={1} opacity={0.2}>
                  <animate attributeName="r" from="55" to="120" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite" />
                </circle>
              </>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={50}
              fill="hsl(220 25% 12%)"
              stroke={centerColor}
              strokeWidth={2}
              style={{ filter: centerGlow !== "none" ? centerGlow.replace(/^/, "drop-shadow(0 0 10px ").slice(0, -1) : "none", transition: "all 0.5s ease" }}
            />
            <text x={cx} y={cy - 14} textAnchor="middle" fill="hsl(220 10% 55%)" fontSize="8" fontFamily="monospace" letterSpacing="0.15em">
              RISK ENGINE
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill={centerColor} fontSize="22" fontFamily="monospace" fontWeight="bold" style={{ transition: "fill 0.3s" }}>
              {highestScore.toFixed(3)}
            </text>
            <text x={cx} y={cy + 22} textAnchor="middle" fill="hsl(220 10% 40%)" fontSize="7" fontFamily="monospace">
              HIGHEST OPP SCORE
            </text>
          </g>

          {/* Agent nodes */}
          {AGENTS.map((agent) => {
            const pos = getNodePos(agent.angle);
            const isActive = activeAgents.has(agent.id);
            const last = lastSignals.get(agent.id);
            const nodeColor = isActive ? agent.color : "hsl(220 15% 25%)";
            const textColor = isActive ? agent.color : "hsl(220 10% 50%)";

            return (
              <g key={agent.id}>
                {isActive && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={38}
                    fill="none"
                    stroke={agent.color}
                    strokeWidth={1.5}
                    opacity={0.3}
                    filter={`url(#glow-${agent.id})`}
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={32}
                  fill="hsl(220 25% 10%)"
                  stroke={nodeColor}
                  strokeWidth={isActive ? 2 : 1}
                  style={{ transition: "all 0.3s ease" }}
                />
                <circle
                  cx={pos.x + 22}
                  cy={pos.y - 22}
                  r={4}
                  fill={isActive ? agent.color : "hsl(220 10% 30%)"}
                  style={{ transition: "fill 0.3s ease" }}
                />
                <text
                  x={pos.x}
                  y={pos.y - 8}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize="6"
                  fontFamily="monospace"
                  letterSpacing="0.08em"
                  style={{ transition: "fill 0.3s" }}
                >
                  {agent.label}
                </text>
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="hsl(220 10% 60%)" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {last?.asset ?? "—"}
                </text>
                <text x={pos.x} y={pos.y + 16} textAnchor="middle" fill="hsl(220 10% 40%)" fontSize="7" fontFamily="monospace">
                  {last ? last.score.toFixed(3) : "0.000"}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Transparent hit-zone buttons for hover + click */}
        <TooltipProvider delayDuration={200}>
          <div className="absolute inset-0 pointer-events-none">
            {AGENTS.map((agent) => {
              const pos = getNodePos(agent.angle);
              const last = lastSignals.get(agent.id);
              return (
                <Tooltip key={agent.id}>
                  <TooltipTrigger asChild>
                    <button
                      className="absolute pointer-events-auto rounded-full focus:outline-none"
                      style={{
                        left: `${(pos.x / 800) * 100}%`,
                        top: `${(pos.y / 600) * 100}%`,
                        width: "8%", aspectRatio: "1",
                        transform: "translate(-50%, -50%)",
                        background: "transparent",
                      }}
                      onClick={() => setSelectedAgentId(prev => prev === agent.id ? null : agent.id)}
                      aria-label={`View details for ${agent.label}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}
                    className="font-mono text-[11px] bg-popover/95 border border-border rounded-sm px-2 py-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: agent.color }} />
                      <span className="font-bold text-foreground tracking-wide">{agent.label}</span>
                    </div>
                    {last
                      ? <div className="text-muted-foreground">{last.asset} · {last.score.toFixed(3)}</div>
                      : <div className="text-muted-foreground">No signal yet</div>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Slide-in side panel */}
        <AnimatePresence>
          {selectedAgentId && (() => {
            const agent   = AGENTS.find(a => a.id === selectedAgentId)!;
            const last    = lastSignals.get(selectedAgentId);
            const history = signalHistory.get(selectedAgentId) ?? [];
            const isActive = activeAgents.has(selectedAgentId);
            return (
              <motion.div
                key="agent-panel"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute top-0 right-0 h-full w-72 border-l border-border bg-background/95 backdrop-blur-sm z-20 overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background/95"
                  style={{ borderLeftColor: agent.color, borderLeftWidth: 3 }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full"
                      style={{ background: isActive ? agent.color : "hsl(220 10% 30%)" }} />
                    <span className="font-mono text-xs font-bold tracking-widest uppercase">{agent.label}</span>
                  </div>
                  <button onClick={() => setSelectedAgentId(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1">✕</button>
                </div>
                {/* Description */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                    {AGENT_DESCRIPTIONS[agent.id]}
                  </p>
                </div>
                {/* Latest signal */}
                {last && (
                  <div className="px-4 py-3 border-b border-border">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">LATEST SIGNAL</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm" style={{ color: agent.color }}>{last.asset}</span>
                      <span className="font-mono text-xs text-muted-foreground">{last.score.toFixed(3)}</span>
                    </div>
                  </div>
                )}
                {/* Signal history */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">SIGNAL HISTORY</div>
                  {history.length === 0
                    ? <p className="text-[10px] font-mono text-muted-foreground">No history yet</p>
                    : <div className="space-y-1.5">
                        {history.map((sig, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] font-mono gap-2">
                            <span className="text-foreground">{sig.asset ?? "—"}</span>
                            <span className="text-muted-foreground">{(sig.score ?? 0).toFixed(3)}</span>
                            <span className="text-muted-foreground/60 tabular-nums">
                              {sig.created_at ? new Date(sig.created_at).toLocaleTimeString([], { hour12: false }) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                  }
                </div>
                {/* Linked decisions */}
                <div className="px-4 py-3">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">RECENT DECISIONS</div>
                  {recentDecisions.length === 0
                    ? <p className="text-[10px] font-mono text-muted-foreground">No decisions yet</p>
                    : <div className="space-y-2">
                        {recentDecisions.slice(0, 3).map((d, i) => (
                          <div key={i} className="border border-border rounded-sm p-2 font-mono text-[10px]">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-foreground">{d.asset ?? "?"}</span>
                              <span className="text-muted-foreground uppercase">{d.action}</span>
                            </div>
                            {d.thesis && <p className="text-muted-foreground/70 leading-snug line-clamp-2">{d.thesis}</p>}
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Recent decisions feed */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 font-mono">
          RECENT DECISIONS
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {recentDecisions.length === 0 ? (
            <div className="col-span-5 text-center text-muted-foreground text-xs font-mono py-6 border border-border rounded-sm">
              AWAITING DECISION FEED…
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {recentDecisions.map((d, i) => {
                const isAlert = d.action === "alert";
                const isPT    = d.action === "paper_trade";
                return (
                  <motion.div
                    key={`${d.asset}-${d.created_at}`}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                      "border rounded-sm p-3 font-mono",
                      isAlert ? "border-terminal-amber/40 bg-terminal-amber/5"
                        : isPT ? "border-terminal-lime/40 bg-terminal-lime/5"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">{d.asset ?? "?"}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm",
                        isAlert ? "bg-terminal-amber/20 text-terminal-amber"
                          : isPT ? "bg-terminal-lime/20 text-terminal-lime"
                          : "bg-secondary text-muted-foreground"
                      )}>{d.action ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-secondary border border-border text-[9px] font-bold text-muted-foreground">
                        {d.metadata_json?.agent_count ?? 0}
                        <span className="ml-0.5 font-normal opacity-60">AGT</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{(d.score ?? 0).toFixed(2)}</span>
                    </div>
                    {d.thesis && (
                      <p className="text-[9px] text-muted-foreground/70 leading-snug line-clamp-2">{d.thesis}</p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
