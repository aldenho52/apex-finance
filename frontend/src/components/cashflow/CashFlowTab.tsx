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

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CashFlowTab() {
  const { data, period, loading, changePeriod } = useCashFlow();

  if (loading) {
    return (
      <div style={{ color: colors.textTertiary, fontSize: fontSizes.body, textAlign: "center", padding: 60 }}>
        Loading cash flow data...
      </div>
    );
  }

  if (!data || data.transaction_count === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: colors.textTertiary, fontSize: fontSizes.body, marginBottom: 8 }}>No transaction data available</p>
        <p style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>Connect a bank account and sync transactions to see your cash flow</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[data.status];
  const netColor = data.net_cash_flow >= 0 ? colors.positive : colors.negative;

  return (
    <div>
      {/* Period Selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: spacing.sectionGap }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => changePeriod(p.key)}
            style={{
              padding: "8px 16px",
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

      {/* Status Badge */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: statusConfig.bg,
        border: `1px solid ${statusConfig.border}`,
        borderRadius: radius.badge,
        padding: "8px 16px",
        marginBottom: spacing.sectionGap,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: statusConfig.color,
          animation: data.status === "building_debt" ? "pulse 1.5s infinite" : undefined,
        }} />
        <span style={{ color: statusConfig.color, fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em" }}>
          {statusConfig.label}
        </span>
        <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>
          {data.net_cash_flow >= 0 ? "+" : ""}{formatCurrency(data.net_cash_flow)} net
        </span>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.cardGap, marginBottom: spacing.sectionGap }}>
        {/* Income */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>INCOME</p>
          <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: colors.positive, margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(data.total_income)}
          </p>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>
            {formatCurrency(data.monthly_avg_income)}/mo avg
          </p>
        </div>

        {/* Expenses */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>EXPENSES</p>
          <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: colors.negative, margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(data.total_expenses)}
          </p>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>
            {formatCurrency(data.monthly_avg_expenses)}/mo avg
          </p>
        </div>

        {/* Net Cash Flow */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>NET CASH FLOW</p>
          <p style={{ fontFamily: fonts.body, fontSize: fontSizes.h2, fontWeight: 600, color: netColor, margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {data.net_cash_flow >= 0 ? "+" : ""}{formatCurrency(data.net_cash_flow)}
          </p>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 4 }}>
            income − expenses
          </p>
        </div>
      </div>

      {/* Breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.cardGap }}>
        {/* Top Expense Categories */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 16, fontWeight: 600 }}>TOP EXPENSES</p>
          {data.top_expense_categories.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>No expense data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.top_expense_categories.map((cat, i) => {
                const maxAmount = data.top_expense_categories[0].amount;
                const pct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: colors.textSecondary, fontSize: fontSizes.caption }}>{cat.category}</span>
                      <span style={{ color: colors.negative, fontSize: fontSizes.caption, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                    <div style={{ height: 4, background: colors.elevatedBg, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: colors.negative, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Income Sources */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, letterSpacing: "0.1em", marginBottom: 16, fontWeight: 600 }}>TOP INCOME SOURCES</p>
          {data.top_income_sources.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>No income data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.top_income_sources.map((src, i) => {
                const maxAmount = data.top_income_sources[0].amount;
                const pct = maxAmount > 0 ? (src.amount / maxAmount) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: colors.textSecondary, fontSize: fontSizes.caption }}>{src.source}</span>
                      <span style={{ color: colors.positive, fontSize: fontSizes.caption, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(src.amount)}
                      </span>
                    </div>
                    <div style={{ height: 4, background: colors.elevatedBg, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: colors.positive, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
