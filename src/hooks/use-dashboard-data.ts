import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000";

export interface DashboardData {
  decisions: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  signals: Record<string, unknown>[];
  runs: Record<string, unknown>[];
}

export type TabKey = keyof DashboardData;

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
      const endpoints: TabKey[] = ["decisions", "opportunities", "signals", "runs"];
      const results = await Promise.all(
        endpoints.map((ep) =>
          fetch(`${API_BASE}/${ep}`).then((res) => {
            if (!res.ok) throw new Error(`${ep}: ${res.status}`);
            return res.json();
          })
        )
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
