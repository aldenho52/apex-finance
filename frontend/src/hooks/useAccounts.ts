import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAccounts } from "../lib/api";
import type { Account } from "../types/accounts";

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data.accounts || []);
      setNetWorth(data.net_worth || 0);
    } catch (e) {
      console.error("Failed to load accounts:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load();
  }, [load]);

  return { accounts, netWorth, loading, refresh: load };
}
