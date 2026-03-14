import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAlerts, acknowledgeAlert as ackApi } from "../lib/api";
import type { Alert } from "../types/alerts";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts || []);
      setCriticalCount(data.critical_count || 0);
    } catch (e) {
      console.error("Failed to load alerts:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load();
  }, [load]);

  const acknowledgeAlert = useCallback(async (alertId: number) => {
    try {
      await ackApi(alertId);
      setAlerts(prev => {
        const alert = prev.find(a => a.id === alertId);
        if (alert?.severity === "critical") {
          setCriticalCount(c => Math.max(0, c - 1));
        }
        return prev.filter(a => a.id !== alertId);
      });
    } catch (e) {
      console.error("Failed to acknowledge:", e);
    }
  }, []);

  return { alerts, criticalCount, loading, acknowledgeAlert, refresh: load };
}
