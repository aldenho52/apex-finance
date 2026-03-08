import type { PayoffComparison } from "../../types/debt";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface StrategyComparisonProps {
  result: PayoffComparison;
}

export default function StrategyComparison({ result }: StrategyComparisonProps) {
  const { strategies, recommendation } = result;

  const columns = [
    { key: "minimum_only" as const, label: "Minimums Only", data: strategies.minimum_only, color: colors.negative },
    { key: "snowball" as const, label: "Snowball", data: strategies.snowball, color: colors.warning },
    { key: "avalanche" as const, label: "Avalanche", data: strategies.avalanche, color: colors.positive },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 12px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em" }}>STRATEGY COMPARISON</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {columns.map(col => {
          const isRecommended = recommendation.strategy === col.key;
          return (
            <div
              key={col.key}
              style={{
                background: isRecommended ? colors.positiveBg : colors.elevatedBg,
                border: `1px solid ${isRecommended ? colors.positiveBorder : colors.border}`,
                borderRadius: radius.button,
                padding: "14px",
                position: "relative",
              }}
            >
              {isRecommended && (
                <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: colors.positive, color: "#000", fontSize: fontSizes.caption, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.1em" }}>
                  RECOMMENDED
                </div>
              )}
              <p style={{ margin: "0 0 12px", color: col.color, fontSize: fontSizes.caption, fontWeight: 700, textAlign: "center" }}>
                {col.label}
              </p>

              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <p style={{ margin: 0, color: colors.textPrimary, fontSize: 22, fontWeight: 700, fontFamily: fonts.body, fontVariantNumeric: "tabular-nums" }}>
                  {col.data.total_months}
                </p>
                <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption }}>months</p>
              </div>

              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Total Interest</span>
                  <span style={{ color: colors.negative, fontSize: fontSizes.caption, fontWeight: 600 }}>${col.data.total_interest.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Total Paid</span>
                  <span style={{ color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 600 }}>${col.data.total_paid.toLocaleString()}</span>
                </div>
                {col.data.interest_saved_vs_minimum !== undefined && col.data.interest_saved_vs_minimum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>You Save</span>
                    <span style={{ color: colors.positive, fontSize: fontSizes.caption, fontWeight: 600 }}>
                      ${col.data.interest_saved_vs_minimum.toLocaleString()}
                    </span>
                  </div>
                )}
                {col.data.months_saved_vs_minimum !== undefined && col.data.months_saved_vs_minimum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Time Saved</span>
                    <span style={{ color: colors.positive, fontSize: fontSizes.caption, fontWeight: 600 }}>
                      {col.data.months_saved_vs_minimum} months
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: colors.positiveBg, border: `1px solid ${colors.positiveBorder}`, borderRadius: radius.button, padding: "12px", marginTop: 12 }}>
        <p style={{ margin: 0, color: colors.positive, fontSize: fontSizes.caption, lineHeight: 1.5 }}>
          {recommendation.reason}
        </p>
      </div>
    </div>
  );
}
