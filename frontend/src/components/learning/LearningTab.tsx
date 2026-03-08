import { useLearning } from "../../hooks/useLearning";
import MarkdownRenderer from "../ui/MarkdownRenderer";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

export default function LearningTab() {
  const { todaysArticle, archive, loading, markRead, toggleBookmark } = useLearning();

  if (loading) {
    return <p style={{ color: "#6b7280", fontSize: 12 }}>Loading today's article...</p>;
  }

  if (!todaysArticle) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No article available yet today.</p>
        <p style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}>Check back soon — articles generate daily at 6am.</p>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLORS[todaysArticle.difficulty] || "#6b7280";

  return (
    <div>
      {/* Today's Article */}
      <div style={{ marginBottom: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            background: `${diffColor}15`, border: `1px solid ${diffColor}40`,
            borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700,
            color: diffColor, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {todaysArticle.difficulty}
          </span>
          <span style={{ color: "#6b7280", fontSize: 10 }}>
            {todaysArticle.reading_time_minutes} min read
          </span>
          <span style={{ color: "#374151", fontSize: 10 }}>•</span>
          <span style={{ color: "#6b7280", fontSize: 10 }}>
            Week {todaysArticle.week_number}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "white",
          fontFamily: "'Syne', sans-serif",
        }}>
          {todaysArticle.title}
        </h2>
        <p style={{ margin: "0 0 16px", color: "#9ca3af", fontSize: 12 }}>
          {todaysArticle.summary}
        </p>

        {/* Content */}
        <div style={{
          background: "#111318", borderRadius: 8, padding: "16px 18px",
          border: "1px solid #1f2937",
        }}>
          <MarkdownRenderer content={todaysArticle.content} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!todaysArticle.user_read ? (
            <button
              onClick={() => markRead(todaysArticle.id)}
              style={{
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 6, padding: "6px 14px", color: "#22c55e",
                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Mark as Read
            </button>
          ) : (
            <span style={{
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 6, padding: "6px 14px", color: "#22c55e",
              fontSize: 11, fontWeight: 700,
            }}>
              Read
            </span>
          )}
          <button
            onClick={() => toggleBookmark(todaysArticle.id)}
            style={{
              background: todaysArticle.user_bookmarked ? "rgba(245,158,11,0.08)" : "transparent",
              border: `1px solid ${todaysArticle.user_bookmarked ? "rgba(245,158,11,0.25)" : "#1f2937"}`,
              borderRadius: 6, padding: "6px 14px",
              color: todaysArticle.user_bookmarked ? "#f59e0b" : "#6b7280",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {todaysArticle.user_bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
      </div>

      {/* Archive */}
      {archive.length > 1 && (
        <div>
          <h3 style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#9ca3af" }}>
            RECENT ARTICLES
          </h3>
          {archive
            .filter((a) => a.id !== todaysArticle.id)
            .slice(0, 6)
            .map((article) => (
              <div
                key={article.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #111827",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0, fontSize: 12, fontWeight: 600,
                    color: article.user_read ? "#6b7280" : "#d1d5db",
                  }}>
                    {article.title}
                  </p>
                  <p style={{ margin: "2px 0 0", color: "#4b5563", fontSize: 10 }}>
                    {new Date(article.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" • "}{article.reading_time_minutes} min
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {article.user_bookmarked && (
                    <span style={{ color: "#f59e0b", fontSize: 10 }}>★</span>
                  )}
                  {article.user_read && (
                    <span style={{
                      background: "rgba(34,197,94,0.1)", borderRadius: 4,
                      padding: "1px 6px", color: "#22c55e", fontSize: 9, fontWeight: 700,
                    }}>
                      READ
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
