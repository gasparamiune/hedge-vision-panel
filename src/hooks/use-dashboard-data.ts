import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export type AssetClassFilter = "ALL" | "CRYPTO" | "STOCK";

export interface DashboardData {
  portfolio: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  signals: Record<string, unknown>[];
  status: Record<string, unknown>[];
}

export type TabKey = keyof DashboardData | "agent_map";

export const TAB_ORDER: (TabKey)[] = ["portfolio", "decisions", "opportunities", "signals", "status", "agent_map"];

const TABLE_MAP: Record<TabKey, string> = {
  portfolio: "paper_trades",
  decisions: "decisions",
  opportunities: "opportunities",
  signals: "signals",
  status: "agent_runs",
};

const TAB_LABELS: Record<TabKey, string> = {
  portfolio: "PORTFOLIO",
  decisions: "DECISIONS",
  opportunities: "OPPORTUNITIES",
  signals: "SIGNALS",
  status: "SYSTEM STATUS",
};

export { TAB_LABELS };

function filterByAssetClass(items: Record<string, unknown>[], filter: AssetClassFilter): Record<string, unknown>[] {
  if (filter === "ALL") return items;
  return items.filter((item) => {
    const ac = (item.asset_class as string)?.toUpperCase?.();
    return ac === filter;
  });
}

export function useDashboardData() {
  const [rawData, setRawData] = useState<DashboardData>({
    portfolio: [],
    decisions: [],
    opportunities: [],
    signals: [],
    status: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClassFilter>("ALL");
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keys = TAB_ORDER;
      const results = await Promise.all(
        keys.map(async (key) => {
          const { data, error } = await supabase
            .from(TABLE_MAP[key])
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw new Error(`${key}: ${error.message}`);
          return data ?? [];
        })
      );
      const newData: DashboardData = {
        portfolio: results[0],
        decisions: results[1],
        opportunities: results[2],
        signals: results[3],
        status: results[4],
      };
      setRawData(newData);
      setLastRefreshTime(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const data: DashboardData = {
    portfolio: filterByAssetClass(rawData.portfolio, assetClassFilter),
    decisions: filterByAssetClass(rawData.decisions, assetClassFilter),
    opportunities: filterByAssetClass(rawData.opportunities, assetClassFilter),
    signals: filterByAssetClass(rawData.signals, assetClassFilter),
    status: rawData.status, // no asset class filter on system status
  };

  return {
    data,
    rawData,
    loading,
    error,
    refresh: fetchData,
    assetClassFilter,
    setAssetClassFilter,
    lastRefreshTime,
  };
}
