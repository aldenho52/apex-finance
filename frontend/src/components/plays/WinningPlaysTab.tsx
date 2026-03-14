import { colors, fonts, fontSizes, radius } from "../../lib/theme";
import { useWinningPlays } from "../../hooks/useWinningPlays";
import PlayCard from "./PlayCard";

export default function WinningPlaysTab() {
  const { plays, loading, refreshing, refresh, dismiss } = useWinningPlays();

  if (loading) {
    return (
      <div
        style={{
          color: colors.textTertiary,
          fontSize: fontSizes.small,
          textAlign: "center",
          padding: 40,
        }}
      >
        Analyzing your finances...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              color: colors.textTertiary,
              fontSize: fontSizes.caption,
              fontWeight: 600,
              letterSpacing: "0.1em",
              fontFamily: fonts.body,
            }}
          >
            WINNING PLAYS
          </span>
          {plays.length > 0 && (
            <span
              style={{
                background: colors.positiveBg,
                border: `1px solid ${colors.positiveBorder}`,
                color: colors.positive,
                fontSize: fontSizes.caption,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: radius.badge,
                fontFamily: fonts.mono,
              }}
            >
              {plays.length}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          style={{
            background: "transparent",
            border: `1px solid ${colors.border}`,
            color: refreshing ? colors.textMuted : colors.textSecondary,
            fontSize: fontSizes.caption,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: radius.button,
            cursor: refreshing ? "default" : "pointer",
            fontFamily: fonts.body,
            letterSpacing: "0.04em",
          }}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Plays list */}
      {plays.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: colors.textTertiary,
          }}
        >
          <div
            style={{
              fontSize: fontSizes.body,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            All caught up
          </div>
          <div style={{ fontSize: fontSizes.small, lineHeight: 1.5 }}>
            No new plays right now. Hit refresh to generate fresh recommendations.
          </div>
        </div>
      ) : (
        plays.map((play) => (
          <PlayCard key={play.play_id} play={play} onDismiss={dismiss} />
        ))
      )}
    </div>
  );
}
