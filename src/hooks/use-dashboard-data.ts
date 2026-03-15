import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface DashboardData {
  decisions: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  signals: Record<string, unknown>[];
  runs: Record<string, unknown>[];
}

export type TabKey = keyof DashboardData;

const TABLE_MAP: Record<TabKey, string> = {
  decisions: "decision_records",
  opportunities: "opportunity_records",
  signals: "signal_records",
  runs: "agent_runs",
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    decisions: [],
    opportunities: [],
    signals: [],
    runs: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keys: TabKey[] = ["decisions", "opportunities", "signals", "runs"];
      const results = await Promise.all(
        keys.map(async (key) => {
          const { data, error } = await supabase
            .from(TABLE_MAP[key])
            .select("*");
          if (error) throw new Error(`${key}: ${error.message}`);
          return data ?? [];
        })
      );
      setData({
        decisions: results[0],
        opportunities: results[1],
        signals: results[2],
        runs: results[3],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
