import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchWinningPlays,
  refreshWinningPlays,
  dismissPlay as dismissApi,
} from "../lib/api";
import type { Play } from "../types/plays";

export function useWinningPlays() {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchWinningPlays();
      setPlays(data.plays || []);
    } catch (e) {
      console.error("Failed to load winning plays:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await refreshWinningPlays();
      setPlays(data.plays || []);
    } catch (e) {
      console.error("Failed to refresh winning plays:", e);
    }
    setRefreshing(false);
  }, []);

  const dismiss = useCallback(async (playId: string) => {
    try {
      await dismissApi(playId);
      setPlays((prev) => prev.filter((p) => p.play_id !== playId));
    } catch (e) {
      console.error("Failed to dismiss play:", e);
    }
  }, []);

  return { plays, loading, refreshing, refresh, dismiss };
}
