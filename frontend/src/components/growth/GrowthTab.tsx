import { useState } from "react";
import CompoundCalculator from "./CompoundCalculator";
import StreakProjector from "./StreakProjector";
import { useGrowth } from "../../hooks/useGrowth";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

type Section = "calculator" | "streak";

export default function GrowthTab() {
  const [section, setSection] = useState<Section>("streak");
  const { history, loading, period, setPeriod } = useGrowth();

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: radius.badge,
    fontSize: fontSizes.caption,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? `1px solid ${colors.positiveBorder}` : `1px solid ${colors.border}`,
    background: active ? colors.positiveBg : "transparent",
    color: active ? colors.positive : colors.textTertiary,
    fontFamily: fonts.body,
    letterSpacing: "0.04em",
    transition: "all 0.15s ease",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: fontSizes.small,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: colors.textPrimary,
          }}
        >
          GROWTH PROJECTOR
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={pillStyle(section === "streak")} onClick={() => setSection("streak")}>
            MY STREAK
          </button>
          <button style={pillStyle(section === "calculator")} onClick={() => setSection("calculator")}>
            CALCULATOR
          </button>
        </div>
      </div>

      {section === "calculator" ? (
        <CompoundCalculator />
      ) : (
        <StreakProjector
          history={history}
          loading={loading}
          period={period}
          onPeriodChange={setPeriod}
        />
      )}
    </div>
  );
}
