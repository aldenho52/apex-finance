import { useState, useEffect, useCallback, useRef } from "react";
import { fetchCashFlow } from "../lib/api";
import type { CashFlowData, CashFlowPeriod } from "../types/cashflow";

export function useCashFlow(initialPeriod: CashFlowPeriod = "monthly") {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [period, setPeriod] = useState<CashFlowPeriod>(initialPeriod);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const load = useCallback(async (p: CashFlowPeriod) => {
    setLoading(true);
    try {
      const result = await fetchCashFlow(p);
      setData(result);
    } catch (e) {
      console.error("Failed to load cash flow:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load(period);
  }, [period, load]);

  const changePeriod = useCallback((p: CashFlowPeriod) => {
    setPeriod(p);
  }, []);

  return { data, period, loading, changePeriod, refresh: () => load(period) };
}
