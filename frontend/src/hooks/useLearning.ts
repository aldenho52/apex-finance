import { useState, useEffect, useCallback } from "react";
import { fetchTodaysArticle, fetchArticleArchive, markArticleRead, toggleArticleBookmark } from "../lib/api";
import type { LearningArticle, ArticleListItem } from "../types/learning";

export function useLearning() {
  const [todaysArticle, setTodaysArticle] = useState<LearningArticle | null>(null);
  const [archive, setArchive] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [articleResult, archiveResult] = await Promise.allSettled([
        fetchTodaysArticle(),
        fetchArticleArchive(7),
      ]);
      if (articleResult.status === "fulfilled") setTodaysArticle(articleResult.value);
      if (archiveResult.status === "fulfilled") setArchive(archiveResult.value.articles || []);
    } catch (e) {
      console.error("Failed to load learning data:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = useCallback(async (articleId: number) => {
    await markArticleRead(articleId);
    setTodaysArticle((prev) => (prev ? { ...prev, user_read: true } : prev));
  }, []);

  const handleToggleBookmark = useCallback(async (articleId: number) => {
    const result = await toggleArticleBookmark(articleId);
    setTodaysArticle((prev) => (prev ? { ...prev, user_bookmarked: result.bookmarked } : prev));
  }, []);

  return {
    todaysArticle,
    archive,
    loading,
    markRead: handleMarkRead,
    toggleBookmark: handleToggleBookmark,
  };
}
