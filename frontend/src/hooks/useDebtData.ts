import { useState, useEffect, useCallback, useRef } from "react";
import { fetchDebtOverview, calculatePayoff, fetchBalanceTransferAnalysis } from "../lib/api";
import type { DebtOverview, PayoffComparison, BalanceTransferAnalysis } from "../types/debt";

export function useDebtData() {
  const [overview, setOverview] = useState<DebtOverview | null>(null);
  const [payoffResult, setPayoffResult] = useState<PayoffComparison | null>(null);
  const [balanceTransfer, setBalanceTransfer] = useState<BalanceTransferAnalysis | null>(null);
  const [extraPayment, setExtraPayment] = useState(200);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    async function load() {
      try {
        const [debtData, btData] = await Promise.allSettled([
          fetchDebtOverview(),
          fetchBalanceTransferAnalysis(),
        ]);
        if (debtData.status === "fulfilled") setOverview(debtData.value);
        if (btData.status === "fulfilled") setBalanceTransfer(btData.value);
      } catch (e) {
        console.error("Failed to load debt data:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const recalculate = useCallback(async (amount: number) => {
    setCalculating(true);
    setExtraPayment(amount);
    try {
      const result = await calculatePayoff(amount);
      setPayoffResult(result);
    } catch (e) {
      console.error("Payoff calculation failed:", e);
    }
    setCalculating(false);
  }, []);

  return { overview, payoffResult, balanceTransfer, extraPayment, loading, calculating, recalculate };
}
