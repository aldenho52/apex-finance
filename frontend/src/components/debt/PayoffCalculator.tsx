import { useState } from "react";
import StrategyComparison from "./StrategyComparison";
import PayoffTimeline from "./PayoffTimeline";
import type { PayoffComparison } from "../../types/debt";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface PayoffCalculatorProps {
  extraPayment: number;
  payoffResult: PayoffComparison | null;
  calculating: boolean;
  onCalculate: (amount: number) => void;
}

const PRESETS = [50, 100, 200, 300, 500];

export default function PayoffCalculator({ extraPayment, payoffResult, calculating, onCalculate }: PayoffCalculatorProps) {
  const [sliderValue, setSliderValue] = useState(extraPayment);

  return (
    <div>
      <p style={{ margin: "0 0 12px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em" }}>DEBT PAYOFF CALCULATOR</p>
      <p style={{ margin: "0 0 14px", color: colors.textTertiary, fontSize: fontSizes.caption, lineHeight: 1.5 }}>
        How much extra can you pay per month beyond minimums?
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setSliderValue(p); onCalculate(p); }}
            style={{
              padding: "7px 14px", borderRadius: radius.button, fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body,
              background: sliderValue === p ? colors.infoBg : "transparent",
              border: `1px solid ${sliderValue === p ? colors.infoBorder : colors.border}`,
              color: sliderValue === p ? colors.info : colors.textTertiary,
            }}
          >
            ${p}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
        <input
          type="range"
          min={0}
          max={2000}
          step={25}
          value={sliderValue}
          onChange={e => setSliderValue(Number(e.target.value))}
          onMouseUp={() => onCalculate(sliderValue)}
          onTouchEnd={() => onCalculate(sliderValue)}
          style={{ flex: 1, accentColor: colors.info }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>$</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={sliderValue}
            onChange={e => {
              const val = Number(e.target.value);
              setSliderValue(val);
              onCalculate(val);
            }}
            style={{ width: 60, background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: 5, padding: "6px 8px", color: colors.textPrimary, fontSize: fontSizes.small, fontFamily: fonts.body, outline: "none", textAlign: "right" }}
          />
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>/mo</span>
        </div>
      </div>

      {calculating && (
        <div style={{ textAlign: "center", padding: 30 }}>
          <p style={{ color: colors.textSecondary, fontSize: fontSizes.small }}>Calculating strategies...</p>
        </div>
      )}

      {!calculating && payoffResult && (
        <>
          <StrategyComparison result={payoffResult} />
          {payoffResult.strategies.avalanche.monthly_breakdown.length > 0 && (
            <PayoffTimeline
              breakdown={payoffResult.strategies.avalanche.monthly_breakdown}
              label="AVALANCHE"
            />
          )}
        </>
      )}

      {!calculating && !payoffResult && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Select an amount to see payoff strategies</p>
        </div>
      )}
    </div>
  );
}
