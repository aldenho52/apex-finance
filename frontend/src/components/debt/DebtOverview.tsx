import DebtCard from "./DebtCard";
import type { DebtOverview as DebtOverviewType } from "../../types/debt";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface DebtOverviewProps {
  overview: DebtOverviewType;
}

export default function DebtOverview({ overview }: DebtOverviewProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: colors.negativeBg, border: `1px solid ${colors.negativeBorder}`, borderRadius: radius.button, padding: "14px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#fca5a5", fontSize: fontSizes.h2, fontWeight: 600, fontFamily: fonts.body, fontVariantNumeric: "tabular-nums" }}>
            ${overview.total_balance.toLocaleString()}
          </p>
          <p style={{ margin: "4px 0 0", color: colors.negative, fontSize: fontSizes.caption }}>Total Debt</p>
        </div>
        <div style={{ background: colors.warningBg, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.button, padding: "14px", textAlign: "center" }}>
          <p style={{ margin: 0, color: colors.warning, fontSize: fontSizes.h2, fontWeight: 600, fontFamily: fonts.body, fontVariantNumeric: "tabular-nums" }}>
            {overview.weighted_avg_apr.toFixed(1)}%
          </p>
          <p style={{ margin: "4px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>Avg APR</p>
        </div>
        <div style={{ background: colors.negativeBg, border: `1px solid ${colors.negativeBorder}`, borderRadius: radius.button, padding: "14px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#fca5a5", fontSize: fontSizes.h2, fontWeight: 600, fontFamily: fonts.body, fontVariantNumeric: "tabular-nums" }}>
            ${overview.total_minimum_payments.toLocaleString()}/mo
          </p>
          <p style={{ margin: "4px 0 0", color: colors.negative, fontSize: fontSizes.caption }}>Total Minimums</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: overview.debts.length > 1 ? "1fr 1fr" : "1fr", gap: 10 }}>
        {overview.debts.map(d => <DebtCard key={d.account_id} debt={d} />)}
      </div>
    </div>
  );
}
