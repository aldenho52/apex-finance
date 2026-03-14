import { useState, useEffect, useCallback, useRef } from "react";
import { fetchGrowthHistory } from "../lib/api";
import type { StreakSnapshot } from "../types/growth";

export function useGrowth() {
  const [history, setHistory] = useState<StreakSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriodState] = useState<"30d" | "12m">("12m");
  const lastFetchedPeriod = useRef<string | null>(null);

  const load = useCallback(async (p: "30d" | "12m") => {
    setLoading(true);
    try {
      const data = await fetchGrowthHistory(p);
      setHistory(data.snapshots || []);
    } catch (e) {
      console.error("Failed to load growth history:", e);
      setHistory([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (lastFetchedPeriod.current === period) return;
    lastFetchedPeriod.current = period;
    load(period);
  }, [period, load]);

  const setPeriod = useCallback(
    (p: "30d" | "12m") => {
      setPeriodState(p);
    },
    []
  );

  return { history, loading, period, setPeriod };
}
