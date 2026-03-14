import { colors, fonts, fontSizes, spacing, radius } from "../../lib/theme";
import { useCashFlow } from "../../hooks/useCashFlow";
import type { CashFlowPeriod, CashFlowStatus } from "../../types/cashflow";

const PERIODS: { key: CashFlowPeriod; label: string }[] = [
  { key: "monthly", label: "1M" },
  { key: "3months", label: "3M" },
  { key: "6months", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1year", label: "1Y" },
  { key: "2years", label: "2Y" },
  { key: "3years", label: "3Y" },
];

const STATUS_CONFIG: Record<CashFlowStatus, { label: string; color: string; bg: string; border: string }> = {
  building_wealth: { label: "BUILDING WEALTH", color: colors.positive, bg: colors.positiveBg, border: colors.positiveBorder },
  building_debt: { label: "BUILDING DEBT", color: colors.negative, bg: colors.negativeBg, border: colors.negativeBorder },
  breaking_even: { label: "BREAKING EVEN", color: colors.warning, bg: colors.warningBg, border: colors.warningBorder },
};

function fmt(amount: number): string {
  return "$" + Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CashFlowHeaderProps {
  netWorth: number;
  accountCount: number;
  totalDebt: number;
  alertCount: number;
  criticalCount: number;
}

export default function CashFlowHeader({ netWorth, accountCount, totalDebt, alertCount, criticalCount }: CashFlowHeaderProps) {
  const { data, period, loading, changePeriod } = useCashFlow();

  const netCashFlow = data?.net_cash_flow ?? 0;
  const netColor = netCashFlow >= 0 ? colors.positive : colors.negative;
  const hasData = data && data.transaction_count > 0;
  const statusConfig = hasData ? STATUS_CONFIG[data.status] : null;

  return (
    <div style={{ marginBottom: spacing.sectionGap }}>
      {/* Top row: existing stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: spacing.cardGap, marginBottom: spacing.cardGap }}>
        {[
          { label: "NET WORTH", value: `$${netWorth.toLocaleString()}`, sub: accountCount ? `${accountCount} accounts` : "connect bank", color: colors.positive },
          { label: "TOTAL DEBT", value: `$${totalDebt.toLocaleString()}`, sub: "credit cards", color: colors.negative },
          { label: "ACTIVE ALERTS", value: `${alertCount}`, sub: criticalCount ? `${criticalCount} critical` : "none critical", color: colors.warning },
          { label: "NET CASH FLOW", value: data ? `${netCashFlow >= 0 ? "+" : "-"}${fmt(netCashFlow)}` : "—", sub: data ? "income − expenses" : "connect bank", color: data ? netColor : colors.textTertiary },
        ].map(item => (
          <div key={item.label} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
            <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>{item.label}</p>
            <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: item.color, margin: 0, fontVariantNumeric: "tabular-nums" }}>{item.value}</p>
            <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Cash Flow Section */}
      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
        {/* Header row with period selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", fontWeight: 600, margin: 0 }}>CASH FLOW</p>
            {statusConfig && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`,
                borderRadius: radius.badge,
                padding: "4px 12px",
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusConfig.color,
                  animation: data?.status === "building_debt" ? "pulse 1.5s infinite" : undefined,
                }} />
                <span style={{ color: statusConfig.color, fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {statusConfig.label}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => changePeriod(p.key)}
                style={{
                  padding: "5px 10px",
                  borderRadius: radius.button,
                  fontSize: fontSizes.caption,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  background: period === p.key ? colors.elevatedBg : "transparent",
                  border: period === p.key ? `1px solid ${colors.border}` : "1px solid transparent",
                  color: period === p.key ? colors.textPrimary : colors.textTertiary,
                  fontFamily: fonts.body,
                  transition: "all 0.15s ease",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: colors.textTertiary, fontSize: fontSizes.body, textAlign: "center", padding: 20 }}>
            Loading...
          </div>
        ) : !data || data.transaction_count === 0 ? (
          <div style={{ color: colors.textTertiary, fontSize: fontSizes.body, textAlign: "center", padding: 20 }}>
            No transaction data — connect a bank and sync to see cash flow
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.cardGap }}>
            {/* Monthly Income */}
            <div style={{ background: colors.elevatedBg, borderRadius: radius.button, padding: 16 }}>
              <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 6, fontWeight: 600 }}>INCOME</p>
              <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: colors.positive, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {fmt(data.total_income)}
              </p>
              <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>
                {fmt(data.monthly_avg_income)}/mo avg
              </p>
            </div>

            {/* Monthly Expenses */}
            <div style={{ background: colors.elevatedBg, borderRadius: radius.button, padding: 16 }}>
              <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 6, fontWeight: 600 }}>EXPENSES</p>
              <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: colors.negative, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {fmt(data.total_expenses)}
              </p>
              <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>
                {fmt(data.monthly_avg_expenses)}/mo avg
              </p>
            </div>

            {/* Net */}
            <div style={{ background: colors.elevatedBg, borderRadius: radius.button, padding: 16 }}>
              <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 6, fontWeight: 600 }}>NET</p>
              <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: netColor, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {netCashFlow >= 0 ? "+" : "-"}{fmt(netCashFlow)}
              </p>
              <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>
                income − expenses
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
