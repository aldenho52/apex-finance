import { useLearning } from "../../hooks/useLearning";
import MarkdownRenderer from "../ui/MarkdownRenderer";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: colors.positive,
  intermediate: colors.warning,
  advanced: colors.negative,
};

export default function LearningTab() {
  const { todaysArticle, archive, loading, markRead, toggleBookmark } = useLearning();

  if (loading) {
    return <p style={{ color: colors.textTertiary, fontSize: fontSizes.small }}>Loading today's article...</p>;
  }

  if (!todaysArticle) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ color: colors.textTertiary, fontSize: fontSizes.body, margin: 0 }}>No article available yet today.</p>
        <p style={{ color: colors.textMuted, fontSize: fontSizes.caption, marginTop: 4 }}>Check back soon — articles generate daily at 6am.</p>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLORS[todaysArticle.difficulty] || colors.textTertiary;

  return (
    <div>
      {/* Today's Article */}
      <div style={{ marginBottom: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            background: `${diffColor}15`, border: `1px solid ${diffColor}40`,
            borderRadius: 4, padding: "3px 8px", fontSize: fontSizes.caption, fontWeight: 600,
            color: diffColor, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {todaysArticle.difficulty}
          </span>
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>
            {todaysArticle.reading_time_minutes} min read
          </span>
          <span style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>•</span>
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>
            Week {todaysArticle.week_number}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: colors.textPrimary,
          fontFamily: fonts.brand,
        }}>
          {todaysArticle.title}
        </h2>
        <p style={{ margin: "0 0 16px", color: colors.textSecondary, fontSize: fontSizes.small }}>
          {todaysArticle.summary}
        </p>

        {/* Content */}
        <div style={{
          background: colors.elevatedBg, borderRadius: radius.button, padding: "18px 20px",
          border: `1px solid ${colors.border}`,
        }}>
          <MarkdownRenderer content={todaysArticle.content} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!todaysArticle.user_read ? (
            <button
              onClick={() => markRead(todaysArticle.id)}
              style={{
                background: colors.positiveBg, border: `1px solid ${colors.positiveBorder}`,
                borderRadius: radius.button, padding: "7px 14px", color: colors.positive,
                fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body,
              }}
            >
              Mark as Read
            </button>
          ) : (
            <span style={{
              background: colors.positiveBg, border: `1px solid ${colors.positiveBorder}`,
              borderRadius: radius.button, padding: "7px 14px", color: colors.positive,
              fontSize: fontSizes.caption, fontWeight: 600,
            }}>
              Read
            </span>
          )}
          <button
            onClick={() => toggleBookmark(todaysArticle.id)}
            style={{
              background: todaysArticle.user_bookmarked ? colors.warningBg : "transparent",
              border: `1px solid ${todaysArticle.user_bookmarked ? colors.warningBorder : colors.border}`,
              borderRadius: radius.button, padding: "7px 14px",
              color: todaysArticle.user_bookmarked ? colors.warning : colors.textTertiary,
              fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body,
            }}
          >
            {todaysArticle.user_bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
      </div>

      {/* Archive */}
      {archive.length > 1 && (
        <div>
          <h3 style={{ margin: "0 0 10px", fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em", color: colors.textTertiary }}>
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
                  padding: "10px 0", borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0, fontSize: fontSizes.small, fontWeight: 600,
                    color: article.user_read ? colors.textTertiary : colors.textSecondary,
                  }}>
                    {article.title}
                  </p>
                  <p style={{ margin: "2px 0 0", color: colors.textMuted, fontSize: fontSizes.caption }}>
                    {new Date(article.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" • "}{article.reading_time_minutes} min
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {article.user_bookmarked && (
                    <span style={{ color: colors.warning, fontSize: fontSizes.caption }}>★</span>
                  )}
                  {article.user_read && (
                    <span style={{
                      background: colors.positiveBg, borderRadius: 4,
                      padding: "2px 6px", color: colors.positive, fontSize: fontSizes.caption, fontWeight: 600,
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
