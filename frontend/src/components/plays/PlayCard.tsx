import { colors, fonts, fontSizes, radius } from "../../lib/theme";
import type { Play } from "../../types/plays";
import { IMPACT_STYLES } from "../../types/plays";

interface PlayCardProps {
  play: Play;
  onDismiss: (playId: string) => void;
}

export default function PlayCard({ play, onDismiss }: PlayCardProps) {
  const style = IMPACT_STYLES[play.impact] || IMPACT_STYLES.MEDIUM;

  return (
    <div
      style={{
        background: colors.elevatedBg,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: 16,
        marginBottom: 10,
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Top row: impact badge + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              color: style.text,
              fontSize: fontSizes.caption,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "3px 10px",
              borderRadius: radius.badge,
              fontFamily: fonts.body,
            }}
          >
            {style.label}
          </span>
          <span
            style={{
              color: colors.textTertiary,
              fontSize: fontSizes.caption,
              fontFamily: fonts.mono,
            }}
          >
            {play.time_to_complete}
          </span>
        </div>
        <button
          onClick={() => onDismiss(play.play_id)}
          style={{
            background: "transparent",
            border: "none",
            color: colors.textMuted,
            fontSize: 16,
            cursor: "pointer",
            padding: "2px 6px",
            lineHeight: 1,
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: fontSizes.body,
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: 6,
          fontFamily: fonts.body,
        }}
      >
        {play.title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: fontSizes.small,
          color: colors.textSecondary,
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        {play.description}
      </div>

      {/* Bottom row: reward + CTA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.body,
              fontWeight: 700,
              color: colors.positive,
            }}
          >
            ${play.reward_amount.toLocaleString()}
          </span>
          <span
            style={{
              color: colors.textTertiary,
              fontSize: fontSizes.caption,
            }}
          >
            {play.reward_timeframe}
          </span>
        </div>
        <button
          style={{
            background: "transparent",
            border: `1px solid ${colors.positive}`,
            color: colors.positive,
            fontSize: fontSizes.caption,
            fontWeight: 600,
            padding: "5px 14px",
            borderRadius: radius.button,
            cursor: "pointer",
            fontFamily: fonts.body,
            letterSpacing: "0.04em",
            transition: "all 0.15s ease",
          }}
        >
          {play.cta_label}
        </button>
      </div>
    </div>
  );
}
