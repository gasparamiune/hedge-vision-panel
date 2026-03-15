import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "https://web-production-80b22.up.railway.app";

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
  { id: "stock_momentum", label: "STOCK MOMENTUM", color: "var(--agent-amber)", angle: 315 },
  { id: "stock_news", label: "STOCK NEWS", color: "var(--agent-yellow)", angle: 270 },
];

interface SignalData {
  agent_name?: string;
  asset?: string;
  score?: number;
  created_at?: string;
}

interface DecisionData {
  action?: string;
  asset?: string;
  agent_count?: number;
  created_at?: string;
  combined_score?: number;
}

interface ActiveAgent {
  id: string;
  asset: string;
  score: number;
  expiry: number;
}

interface Particle {
  id: string;
  agentId: string;
  progress: number;
  color: string;
}

interface CenterPulse {
  type: "alert" | "paper_trade" | "agreement";
  expiry: number;
}

export function AgentMapTab() {
  const [activeAgents, setActiveAgents] = useState<Map<string, ActiveAgent>>(new Map());
  const [lastSignals, setLastSignals] = useState<Map<string, { asset: string; score: number }>>(new Map());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [centerPulse, setCenterPulse] = useState<CenterPulse | null>(null);
  const [highestScore, setHighestScore] = useState<number>(0);
  const [recentDecisions, setRecentDecisions] = useState<DecisionData[]>([]);
  const animFrameRef = useRef<number>(0);
  const particleIdRef = useRef(0);

  const normalizeAgentName = (name: string): string => {
    return name?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  };

  const processSignals = useCallback((signals: SignalData[]) => {
    const now = Date.now();
    const newActive = new Map(activeAgents);
    const newLastSignals = new Map(lastSignals);
    const newParticles: Particle[] = [];

    // Track which assets have signals from multiple agents
    const assetAgents: Record<string, string[]> = {};

    signals.forEach((sig) => {
      const agentId = normalizeAgentName(sig.agent_name ?? "");
      const agent = AGENTS.find((a) => a.id === agentId);
      if (!agent) return;

      const score = sig.score ?? 0;
      const asset = sig.asset ?? "???";

      newLastSignals.set(agentId, { asset, score });

      if (score > 0.1) {
        newActive.set(agentId, { id: agentId, asset, score, expiry: now + 3000 });

        // Create particle
        particleIdRef.current++;
        newParticles.push({
          id: `p-${particleIdRef.current}`,
          agentId,
          progress: 0,
          color: agent.color,
        });

        if (!assetAgents[asset]) assetAgents[asset] = [];
        assetAgents[asset].push(agentId);
      }
    });

    // Check for 3+ agent agreement
    Object.entries(assetAgents).forEach(([, agents]) => {
      if (agents.length >= 3) {
        agents.forEach((id) => {
          const existing = newActive.get(id);
          if (existing) newActive.set(id, { ...existing, expiry: Date.now() + 3000 });
        });
        setCenterPulse({ type: "agreement", expiry: Date.now() + 3000 });
      }
    });

    setActiveAgents(newActive);
    setLastSignals(newLastSignals);
    setParticles((prev) => [...prev, ...newParticles]);

    // Update highest score
    const maxScore = signals.reduce((max, s) => Math.max(max, s.score ?? 0), 0);
    if (maxScore > 0) setHighestScore(maxScore);
  }, [activeAgents, lastSignals]);

  const processDecisions = useCallback((decisions: DecisionData[]) => {
    if (decisions.length === 0) return;
    setRecentDecisions((prev) => [...decisions, ...prev].slice(0, 5));

    const latest = decisions[0];
    if (latest?.action === "alert") {
      setCenterPulse({ type: "alert", expiry: Date.now() + 3000 });
    } else if (latest?.action === "paper_trade") {
      setCenterPulse({ type: "paper_trade", expiry: Date.now() + 3000 });
    }

    const maxScore = decisions.reduce((max, d) => Math.max(max, d.combined_score ?? 0), 0);
    if (maxScore > 0) setHighestScore(maxScore);
  }, []);

  // Poll API
  useEffect(() => {
    const poll = async () => {
      try {
        const [sigRes, decRes] = await Promise.all([
          fetch(`${API_BASE}/signals?since_hours=0.1`),
          fetch(`${API_BASE}/decisions?since_hours=0.1`),
        ]);
        if (sigRes.ok) {
          const signals = await sigRes.json();
          if (Array.isArray(signals) && signals.length > 0) processSignals(signals);
        }
        if (decRes.ok) {
          const decisions = await decRes.json();
          if (Array.isArray(decisions) && decisions.length > 0) processDecisions(decisions);
        }
      } catch {
        // silent
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [processSignals, processDecisions]);

  // Animate particles + cleanup expired states
  useEffect(() => {
    let lastTime = performance.now();
    const tick = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const now = Date.now();

      // Advance particles
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + dt * 0.8 }))
          .filter((p) => p.progress < 1)
      );

      // Cleanup expired active agents
      setActiveAgents((prev) => {
        const next = new Map(prev);
        let changed = false;
        next.forEach((v, k) => {
          if (v.expiry < now) { next.delete(k); changed = true; }
        });
        return changed ? next : prev;
      });

      // Cleanup center pulse
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

          {/* Connection lines */}
          {AGENTS.map((agent) => {
            const pos = getNodePos(agent.angle);
            const isActive = activeAgents.has(agent.id);
            return (
              <line
                key={`line-${agent.id}`}
                x1={pos.x}
                y1={pos.y}
                x2={cx}
                y2={cy}
                stroke={isActive ? agent.color : "hsl(220 20% 20%)"}
                strokeWidth={isActive ? 2 : 0.8}
                opacity={isActive ? 0.8 : 0.3}
                style={{ transition: "all 0.5s ease" }}
              />
            );
          })}

          {/* Particles */}
          {particles.map((p) => {
            const agent = AGENTS.find((a) => a.id === p.agentId);
            if (!agent) return null;
            const start = getNodePos(agent.angle);
            const px = start.x + (cx - start.x) * p.progress;
            const py = start.y + (cy - start.y) * p.progress;
            return (
              <circle
                key={p.id}
                cx={px}
                cy={py}
                r={3}
                fill={p.color}
                opacity={1 - p.progress * 0.5}
                filter={`url(#glow-${p.agentId})`}
              />
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
                {/* Glow ring when active */}
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
                {/* Status dot */}
                <circle
                  cx={pos.x + 22}
                  cy={pos.y - 22}
                  r={4}
                  fill={isActive ? agent.color : "hsl(220 10% 30%)"}
                  style={{ transition: "fill 0.3s ease" }}
                />
                {/* Agent label */}
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
                {/* Last asset */}
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="hsl(220 10% 60%)" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {last?.asset ?? "—"}
                </text>
                {/* Last score */}
                <text x={pos.x} y={pos.y + 16} textAnchor="middle" fill="hsl(220 10% 40%)" fontSize="7" fontFamily="monospace">
                  {last ? last.score.toFixed(3) : "0.000"}
                </text>
              </g>
            );
          })}
        </svg>
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
            recentDecisions.map((d, i) => {
              const isAlert = d.action === "alert";
              const isPT = d.action === "paper_trade";
              const borderColor = isAlert
                ? "border-terminal-amber/40"
                : isPT
                  ? "border-terminal-lime/40"
                  : "border-border";
              const bgColor = isAlert
                ? "bg-terminal-amber/5"
                : isPT
                  ? "bg-terminal-lime/5"
                  : "bg-card";
              return (
                <div
                  key={`${d.asset}-${d.created_at}-${i}`}
                  className={`border ${borderColor} ${bgColor} rounded-sm p-3 font-mono`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{d.asset ?? "?"}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                        isAlert
                          ? "bg-terminal-amber/20 text-terminal-amber"
                          : isPT
                            ? "bg-terminal-lime/20 text-terminal-lime"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {d.action ?? "—"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {d.agent_count ?? 0} agents • {(d.combined_score ?? 0).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
