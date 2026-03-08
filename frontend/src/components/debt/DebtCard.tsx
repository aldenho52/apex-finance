import type { DebtAccount } from "../../types/debt";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface DebtCardProps {
  debt: DebtAccount;
}

export default function DebtCard({ debt }: DebtCardProps) {
  const monthlyInterest = (debt.balance * (debt.apr / 100 / 12));

  return (
    <div style={{ background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: 600 }}>{debt.name}</p>
          {debt.due_date && <p style={{ margin: "2px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>Due {debt.due_date}</p>}
        </div>
        <p style={{ margin: 0, color: colors.negative, fontSize: 16, fontWeight: 600, fontFamily: fonts.body, fontVariantNumeric: "tabular-nums" }}>
          ${debt.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: fontSizes.caption }}>
        <div>
          <p style={{ margin: 0, color: colors.textTertiary }}>APR</p>
          <p style={{ margin: 0, color: colors.warning, fontWeight: 600 }}>{debt.apr.toFixed(2)}%</p>
        </div>
        <div>
          <p style={{ margin: 0, color: colors.textTertiary }}>Minimum</p>
          <p style={{ margin: 0, color: colors.textSecondary, fontWeight: 600 }}>${debt.minimum_payment.toLocaleString()}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: colors.textTertiary }}>Monthly Interest</p>
          <p style={{ margin: 0, color: colors.negative, fontWeight: 600 }}>${monthlyInterest.toFixed(2)}</p>
        </div>
      </div>

      {debt.utilization !== null && debt.utilization !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>UTILIZATION</span>
            <span style={{ color: debt.utilization > 70 ? colors.negative : debt.utilization > 30 ? colors.warning : colors.positive, fontSize: fontSizes.caption, fontWeight: 600 }}>
              {debt.utilization.toFixed(0)}%
            </span>
          </div>
          <div style={{ height: 3, background: colors.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(debt.utilization, 100)}%`,
              background: debt.utilization > 70 ? colors.negative : debt.utilization > 30 ? colors.warning : colors.positive,
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
