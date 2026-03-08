import { colors, fonts, fontSizes, radius } from "../../lib/theme";

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
    return <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, textAlign: "center", padding: 40 }}>No rental report yet. Add a property to get started.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>RENTAL INTELLIGENCE</h3>
          <p style={{ margin: "3px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>{rental.month}</p>
        </div>
        {rental.analysis && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: fonts.brand, fontSize: 20, fontWeight: 800, color: colors.warning }}>{rental.analysis.verdict}</span>
            <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption }}>Current Verdict</p>
          </div>
        )}
      </div>

      {rental.pnl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { l: "Equity", v: `$${(rental.pnl.equity / 1000).toFixed(0)}K`, c: colors.positive },
            { l: "Effective Cost", v: `$${rental.pnl.effective_cost}/mo`, c: rental.pnl.effective_cost < 0 ? colors.negative : colors.positive },
            { l: "Cash Flow", v: `$${rental.pnl.cash_flow}/mo`, c: rental.pnl.cash_flow < 0 ? colors.negative : colors.positive },
          ].map(x => (
            <div key={x.l} style={{ background: colors.elevatedBg, borderRadius: radius.button, padding: "14px", textAlign: "center" }}>
              <p style={{ margin: 0, color: x.c, fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{x.v}</p>
              <p style={{ margin: "4px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>{x.l}</p>
            </div>
          ))}
        </div>
      )}

      {rental.narrative && (
        <div style={{ background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "14px", marginBottom: 12 }}>
          <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, lineHeight: 1.6, margin: 0 }}>{rental.narrative}</p>
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
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: label === "Effective Monthly Cost" ? "none" : `1px solid ${colors.border}` }}>
              <span style={{ color: label === "Effective Monthly Cost" ? colors.textSecondary : colors.textTertiary, fontSize: fontSizes.small, fontWeight: label === "Effective Monthly Cost" ? 700 : 400 }}>{label}</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: label === "Depreciation Shield" ? colors.positive : label === "Effective Monthly Cost" ? colors.negative : colors.textSecondary, fontSize: fontSizes.small, fontWeight: label === "Effective Monthly Cost" ? 700 : 400 }}>{val}</span>
                {sub && <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption }}>{sub}</p>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
