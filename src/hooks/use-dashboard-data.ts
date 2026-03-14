import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "https://margaretta-unchafed-lorna.ngrok-free.dev";

export interface DashboardData {
  decisions: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  signals: Record<string, unknown>[];
  runs: Record<string, unknown>[];
}

export type TabKey = keyof DashboardData;

const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    decisions: [],
    opportunities: [],
    signals: [],
    runs: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoints: TabKey[] = ["decisions", "opportunities", "signals", "runs"];
      const results = await Promise.all(
        endpoints.map((ep) =>
          fetch(`${API_BASE}/${ep}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
          }).then((res) => {
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
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData, lastRefresh };
}
