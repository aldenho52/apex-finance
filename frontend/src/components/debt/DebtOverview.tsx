import DebtCard from "./DebtCard";
import type { DebtOverview as DebtOverviewType } from "../../types/debt";

interface DebtOverviewProps {
  overview: DebtOverviewType;
}

export default function DebtOverview({ overview }: DebtOverviewProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "#1a0a0a", border: "1px solid #3f1515", borderRadius: 8, padding: "12px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#fca5a5", fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
            ${overview.total_balance.toLocaleString()}
          </p>
          <p style={{ margin: "3px 0 0", color: "#9b3a3a", fontSize: 10 }}>Total Debt</p>
        </div>
        <div style={{ background: "#1a0a0a", border: "1px solid #3f1515", borderRadius: 8, padding: "12px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#fcd34d", fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
            {overview.weighted_avg_apr.toFixed(1)}%
          </p>
          <p style={{ margin: "3px 0 0", color: "#9b3a3a", fontSize: 10 }}>Avg APR</p>
        </div>
        <div style={{ background: "#1a0a0a", border: "1px solid #3f1515", borderRadius: 8, padding: "12px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#fca5a5", fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
            ${overview.total_minimum_payments.toLocaleString()}/mo
          </p>
          <p style={{ margin: "3px 0 0", color: "#9b3a3a", fontSize: 10 }}>Total Minimums</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: overview.debts.length > 1 ? "1fr 1fr" : "1fr", gap: 10 }}>
        {overview.debts.map(d => <DebtCard key={d.account_id} debt={d} />)}
      </div>
    </div>
  );
}
