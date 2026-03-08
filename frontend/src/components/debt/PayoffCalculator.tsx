import { useState } from "react";
import StrategyComparison from "./StrategyComparison";
import PayoffTimeline from "./PayoffTimeline";
import type { PayoffComparison } from "../../types/debt";

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
      <p style={{ margin: "0 0 12px", color: "#d1d5db", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>DEBT PAYOFF CALCULATOR</p>
      <p style={{ margin: "0 0 14px", color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>
        How much extra can you pay per month beyond minimums?
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setSliderValue(p); onCalculate(p); }}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: sliderValue === p ? "rgba(59,130,246,0.15)" : "transparent",
              border: `1px solid ${sliderValue === p ? "rgba(59,130,246,0.4)" : "#1a1f2e"}`,
              color: sliderValue === p ? "#93c5fd" : "#9ca3af",
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
          style={{ flex: 1, accentColor: "#3b82f6" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#6b7280", fontSize: 11 }}>$</span>
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
            style={{ width: 60, background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 5, padding: "5px 8px", color: "white", fontSize: 12, fontFamily: "inherit", outline: "none", textAlign: "right" }}
          />
          <span style={{ color: "#6b7280", fontSize: 10 }}>/mo</span>
        </div>
      </div>

      {calculating && (
        <div style={{ textAlign: "center", padding: 30 }}>
          <p style={{ color: "#9ca3af", fontSize: 12 }}>Calculating strategies...</p>
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
          <p style={{ color: "#6b7280", fontSize: 11 }}>Select an amount to see payoff strategies</p>
        </div>
      )}
    </div>
  );
}
