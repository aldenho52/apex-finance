import type { PayoffComparison } from "../../types/debt";

interface StrategyComparisonProps {
  result: PayoffComparison;
}

export default function StrategyComparison({ result }: StrategyComparisonProps) {
  const { strategies, recommendation } = result;

  const columns = [
    { key: "minimum_only" as const, label: "Minimums Only", data: strategies.minimum_only, color: "#ef4444" },
    { key: "snowball" as const, label: "Snowball", data: strategies.snowball, color: "#f59e0b" },
    { key: "avalanche" as const, label: "Avalanche", data: strategies.avalanche, color: "#22c55e" },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 12px", color: "#d1d5db", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>STRATEGY COMPARISON</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {columns.map(col => {
          const isRecommended = recommendation.strategy === col.key;
          return (
            <div
              key={col.key}
              style={{
                background: isRecommended ? "rgba(34,197,94,0.08)" : "#111318",
                border: `1px solid ${isRecommended ? "rgba(34,197,94,0.3)" : "#1a1f2e"}`,
                borderRadius: 8,
                padding: "14px",
                position: "relative",
              }}
            >
              {isRecommended && (
                <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#000", fontSize: 8, fontWeight: 800, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.1em" }}>
                  RECOMMENDED
                </div>
              )}
              <p style={{ margin: "0 0 12px", color: col.color, fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                {col.label}
              </p>

              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <p style={{ margin: 0, color: "white", fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>
                  {col.data.total_months}
                </p>
                <p style={{ margin: 0, color: "#9ca3af", fontSize: 9 }}>months</p>
              </div>

              <div style={{ borderTop: "1px solid #1a1f2e", paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#9ca3af", fontSize: 10 }}>Total Interest</span>
                  <span style={{ color: "#f87171", fontSize: 10, fontWeight: 600 }}>${col.data.total_interest.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#9ca3af", fontSize: 10 }}>Total Paid</span>
                  <span style={{ color: "#d1d5db", fontSize: 10, fontWeight: 600 }}>${col.data.total_paid.toLocaleString()}</span>
                </div>
                {col.data.interest_saved_vs_minimum !== undefined && col.data.interest_saved_vs_minimum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#9ca3af", fontSize: 10 }}>You Save</span>
                    <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 700 }}>
                      ${col.data.interest_saved_vs_minimum.toLocaleString()}
                    </span>
                  </div>
                )}
                {col.data.months_saved_vs_minimum !== undefined && col.data.months_saved_vs_minimum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ color: "#9ca3af", fontSize: 10 }}>Time Saved</span>
                    <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 700 }}>
                      {col.data.months_saved_vs_minimum} months
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "12px", marginTop: 12 }}>
        <p style={{ margin: 0, color: "#22c55e", fontSize: 11, lineHeight: 1.5 }}>
          {recommendation.reason}
        </p>
      </div>
    </div>
  );
}
