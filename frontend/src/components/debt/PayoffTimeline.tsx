import type { MonthlyBreakdown } from "../../types/debt";

interface PayoffTimelineProps {
  breakdown: MonthlyBreakdown[];
  label: string;
}

export default function PayoffTimeline({ breakdown, label }: PayoffTimelineProps) {
  if (breakdown.length === 0) return null;

  const maxBalance = breakdown[0].remaining_balance;
  // Show every Nth bar to keep it readable
  const step = Math.max(1, Math.floor(breakdown.length / 24));
  const sampled = breakdown.filter((_, i) => i % step === 0 || i === breakdown.length - 1);

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 10px", color: "#d1d5db", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
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
                background: height > 60 ? "#ef4444" : height > 30 ? "#f59e0b" : "#22c55e",
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
        <span style={{ color: "#6b7280", fontSize: 9 }}>Month 1</span>
        <span style={{ color: "#6b7280", fontSize: 9 }}>Month {breakdown.length}</span>
      </div>
    </div>
  );
}
