interface RentalData {
  month?: string;
  analysis?: { verdict: string };
  pnl?: {
    equity: number;
    effective_cost: number;
    cash_flow: number;
    mortgage_total: number;
    mortgage_principal: number;
    mortgage_interest: number;
    insurance?: number;
    property_tax?: number;
    monthly_tax_savings: number;
  };
  narrative?: string;
}

interface RentalTabProps {
  rental: RentalData | null;
}

export default function RentalTab({ rental }: RentalTabProps) {
  if (!rental) {
    return <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 40 }}>No rental report yet. Add a property to get started.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>RENTAL INTELLIGENCE</h3>
          <p style={{ margin: "3px 0 0", color: "#9ca3af", fontSize: 11 }}>{rental.month}</p>
        </div>
        {rental.analysis && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{rental.analysis.verdict}</span>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 10 }}>Current Verdict</p>
          </div>
        )}
      </div>

      {rental.pnl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { l: "Equity", v: `$${(rental.pnl.equity / 1000).toFixed(0)}K`, c: "#22c55e" },
            { l: "Effective Cost", v: `$${rental.pnl.effective_cost}/mo`, c: rental.pnl.effective_cost < 0 ? "#f87171" : "#22c55e" },
            { l: "Cash Flow", v: `$${rental.pnl.cash_flow}/mo`, c: rental.pnl.cash_flow < 0 ? "#f87171" : "#22c55e" },
          ].map(x => (
            <div key={x.l} style={{ background: "#111318", borderRadius: 8, padding: "12px", textAlign: "center" }}>
              <p style={{ margin: 0, color: x.c, fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{x.v}</p>
              <p style={{ margin: "3px 0 0", color: "#9ca3af", fontSize: 10 }}>{x.l}</p>
            </div>
          ))}
        </div>
      )}

      {rental.narrative && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1f2e", borderRadius: 8, padding: "12px", marginBottom: 12 }}>
          <p style={{ color: "#d1d5db", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{rental.narrative}</p>
        </div>
      )}

      {rental.pnl && (
        <>
          {([
            ["Mortgage P+I", `-$${rental.pnl.mortgage_total}/mo`, `$${rental.pnl.mortgage_principal} principal · $${rental.pnl.mortgage_interest} interest`],
            ["Insurance + Taxes", `-$${(rental.pnl.insurance || 0) + (rental.pnl.property_tax || 0)}/mo`, null],
            ["Depreciation Shield", `+$${rental.pnl.monthly_tax_savings}/mo tax benefit`, null],
            ["Effective Monthly Cost", `$${rental.pnl.effective_cost}/mo`, "after all benefits"],
          ] as const).map(([label, val, sub]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: label === "Effective Monthly Cost" ? "none" : "1px solid #111827" }}>
              <span style={{ color: label === "Effective Monthly Cost" ? "#d1d5db" : "#9ca3af", fontSize: 12, fontWeight: label === "Effective Monthly Cost" ? 700 : 400 }}>{label}</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: label === "Depreciation Shield" ? "#22c55e" : label === "Effective Monthly Cost" ? "#f87171" : "#d1d5db", fontSize: 12, fontWeight: label === "Effective Monthly Cost" ? 700 : 400 }}>{val}</span>
                {sub && <p style={{ margin: 0, color: "#6b7280", fontSize: 10 }}>{sub}</p>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
