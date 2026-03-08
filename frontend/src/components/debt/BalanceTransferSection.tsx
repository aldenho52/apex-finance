import type { BalanceTransferAnalysis } from "../../types/debt";

interface BalanceTransferSectionProps {
  data: BalanceTransferAnalysis | null;
}

export default function BalanceTransferSection({ data }: BalanceTransferSectionProps) {
  if (!data || !data.has_debt) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ margin: "0 0 12px", color: "#d1d5db", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>BALANCE TRANSFER OPTIONS</p>
      <p style={{ margin: "0 0 14px", color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>
        Transfer your balance to a 0% APR card and pay no interest during the promo period.
      </p>

      {data.recommendations.map((rec, idx) => (
        <div
          key={idx}
          style={{
            background: idx === 0 ? "rgba(34,197,94,0.08)" : "#111318",
            border: idx === 0 ? "1px solid rgba(34,197,94,0.3)" : "1px solid #1a1f2e",
            borderRadius: 8,
            padding: "14px",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 600 }}>{rec.offer_name}</p>
              <p style={{ margin: "3px 0 0", color: "#9ca3af", fontSize: 10 }}>{rec.promo_months} months at 0% APR</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, color: idx === 0 ? "#22c55e" : "#f59e0b", fontSize: 16, fontWeight: 700 }}>
                +${rec.net_savings.toLocaleString()}
              </p>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 9 }}>net savings</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 10 }}>
            <div>
              <p style={{ margin: 0, color: "#9ca3af" }}>Transfer Fee</p>
              <p style={{ margin: 0, color: "#d1d5db" }}>${rec.transfer_fee_dollar.toLocaleString()} ({rec.transfer_fee_pct * 100}%)</p>
            </div>
            <div>
              <p style={{ margin: 0, color: "#9ca3af" }}>Interest Saved</p>
              <p style={{ margin: 0, color: "#22c55e" }}>${rec.interest_saved.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: "#9ca3af" }}>Monthly Payment</p>
              <p style={{ margin: 0, color: "#93c5fd" }}>${rec.monthly_payment_needed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}

      {data.best_recommendation && (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "14px", marginTop: 6 }}>
          <p style={{ margin: 0, color: "#22c55e", fontSize: 11, fontWeight: 600, textAlign: "center" }}>
            Transfer ${data.total_balance.toLocaleString()} to {data.best_recommendation.offer_name} and save ${data.best_recommendation.net_savings.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
