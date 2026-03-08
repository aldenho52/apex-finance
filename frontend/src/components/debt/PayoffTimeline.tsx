import type { MonthlyBreakdown } from "../../types/debt";
import { colors, fontSizes } from "../../lib/theme";

interface PayoffTimelineProps {
  breakdown: MonthlyBreakdown[];
  label: string;
}

export default function PayoffTimeline({ breakdown, label }: PayoffTimelineProps) {
  if (breakdown.length === 0) return null;

  const maxBalance = breakdown[0].remaining_balance;
  const step = Math.max(1, Math.floor(breakdown.length / 24));
  const sampled = breakdown.filter((_, i) => i % step === 0 || i === breakdown.length - 1);

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 10px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em" }}>
        {label} — PAYOFF TIMELINE
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, padding: "0 2px" }}>
        {sampled.map(m => {
          const height = maxBalance > 0 ? (m.remaining_balance / maxBalance) * 100 : 0;
          return (
            <div
              key={m.month}
              title={`Month ${m.month}: $${m.remaining_balance.toLocaleString()}`}
              style={{
                flex: 1,
                height: `${Math.max(height, 1)}%`,
                background: height > 60 ? colors.negative : height > 30 ? colors.warning : colors.positive,
                borderRadius: "2px 2px 0 0",
                minWidth: 3,
                opacity: 0.8,
                transition: "height 0.3s ease",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Month 1</span>
        <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Month {breakdown.length}</span>
      </div>
    </div>
  );
}
