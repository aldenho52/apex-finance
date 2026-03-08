import type { DebtAccount } from "../../types/debt";

interface DebtCardProps {
  debt: DebtAccount;
}

export default function DebtCard({ debt }: DebtCardProps) {
  const monthlyInterest = (debt.balance * (debt.apr / 100 / 12));

  return (
    <div style={{ background: "#111318", border: "1px solid #1a1f2e", borderRadius: 8, padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 600 }}>{debt.name}</p>
          {debt.due_date && <p style={{ margin: "2px 0 0", color: "#9ca3af", fontSize: 10 }}>Due {debt.due_date}</p>}
        </div>
        <p style={{ margin: 0, color: "#ef4444", fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
          ${debt.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 10 }}>
        <div>
          <p style={{ margin: 0, color: "#9ca3af" }}>APR</p>
          <p style={{ margin: 0, color: "#fcd34d", fontWeight: 600 }}>{debt.apr.toFixed(2)}%</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "#9ca3af" }}>Minimum</p>
          <p style={{ margin: 0, color: "#d1d5db", fontWeight: 600 }}>${debt.minimum_payment.toLocaleString()}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "#9ca3af" }}>Monthly Interest</p>
          <p style={{ margin: 0, color: "#f87171", fontWeight: 600 }}>${monthlyInterest.toFixed(2)}</p>
        </div>
      </div>

      {debt.utilization !== null && debt.utilization !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#9ca3af", fontSize: 9 }}>UTILIZATION</span>
            <span style={{ color: debt.utilization > 70 ? "#ef4444" : debt.utilization > 30 ? "#f59e0b" : "#22c55e", fontSize: 9, fontWeight: 700 }}>
              {debt.utilization.toFixed(0)}%
            </span>
          </div>
          <div style={{ height: 3, background: "#1a1f2e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(debt.utilization, 100)}%`,
              background: debt.utilization > 70 ? "#ef4444" : debt.utilization > 30 ? "#f59e0b" : "#22c55e",
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
