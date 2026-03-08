import type { BalanceTransferAnalysis } from "../../types/debt";
import { colors, fontSizes, radius } from "../../lib/theme";

interface BalanceTransferSectionProps {
  data: BalanceTransferAnalysis | null;
}

export default function BalanceTransferSection({ data }: BalanceTransferSectionProps) {
  if (!data || !data.has_debt) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ margin: "0 0 12px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em" }}>BALANCE TRANSFER OPTIONS</p>
      <p style={{ margin: "0 0 14px", color: colors.textTertiary, fontSize: fontSizes.caption, lineHeight: 1.5 }}>
        Transfer your balance to a 0% APR card and pay no interest during the promo period.
      </p>

      {data.recommendations.map((rec, idx) => (
        <div
          key={idx}
          style={{
            background: idx === 0 ? colors.positiveBg : colors.elevatedBg,
            border: `1px solid ${idx === 0 ? colors.positiveBorder : colors.border}`,
            borderRadius: radius.button,
            padding: "14px",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: 0, color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: 600 }}>{rec.offer_name}</p>
              <p style={{ margin: "3px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>{rec.promo_months} months at 0% APR</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, color: idx === 0 ? colors.positive : colors.warning, fontSize: 16, fontWeight: 600 }}>
                +${rec.net_savings.toLocaleString()}
              </p>
              <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption }}>net savings</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: fontSizes.caption }}>
            <div>
              <p style={{ margin: 0, color: colors.textTertiary }}>Transfer Fee</p>
              <p style={{ margin: 0, color: colors.textSecondary }}>${rec.transfer_fee_dollar.toLocaleString()} ({rec.transfer_fee_pct * 100}%)</p>
            </div>
            <div>
              <p style={{ margin: 0, color: colors.textTertiary }}>Interest Saved</p>
              <p style={{ margin: 0, color: colors.positive }}>${rec.interest_saved.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: colors.textTertiary }}>Monthly Payment</p>
              <p style={{ margin: 0, color: colors.info }}>${rec.monthly_payment_needed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}

      {data.best_recommendation && (
        <div style={{ background: colors.positiveBg, border: `1px solid ${colors.positiveBorder}`, borderRadius: radius.button, padding: "14px", marginTop: 6 }}>
          <p style={{ margin: 0, color: colors.positive, fontSize: fontSizes.caption, fontWeight: 600, textAlign: "center" }}>
            Transfer ${data.total_balance.toLocaleString()} to {data.best_recommendation.offer_name} and save ${data.best_recommendation.net_savings.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
