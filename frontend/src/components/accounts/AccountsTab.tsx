import PlaidLinkButton from "../PlaidLink";
import type { Account } from "../../types/accounts";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface AccountsTabProps {
  accounts: Account[];
  onBankConnected: () => void;
}

export default function AccountsTab({ accounts, onBankConnected }: AccountsTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>ALL ACCOUNTS</h3>
        <PlaidLinkButton onSuccess={onBankConnected} />
      </div>
      {accounts.length === 0 ? (
        <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, textAlign: "center", padding: 40 }}>No accounts connected yet. Click "Connect Bank" above to link your bank.</p>
      ) : (
        accounts.map(acc => {
          const isLiability = acc.type === "credit" || acc.type === "loan";
          const typeColor = isLiability ? colors.negative : acc.type === "investment" ? colors.positive : colors.info;
          const typeBg = isLiability ? colors.negativeBg : acc.type === "investment" ? colors.positiveBg : colors.infoBg;
          const typeBorder = isLiability ? colors.negativeBorder : acc.type === "investment" ? colors.positiveBorder : colors.infoBorder;
          const displayBalance = isLiability ? -Math.abs(acc.balance_current) : acc.balance_current;
          return (
            <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: radius.button, background: typeBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fontSizes.small, fontWeight: 700, color: typeColor, border: `1px solid ${typeBorder}` }}>
                  {acc.name.charAt(0)}
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: 500 }}>{acc.name}</p>
                  <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption }}>{acc.type}{acc.subtype ? ` · ${acc.subtype}` : ""}</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, color: displayBalance < 0 ? colors.negative : colors.positive, fontSize: 15, fontWeight: 600, fontFamily: fonts.body, fontVariantNumeric: "tabular-nums" }}>
                  {displayBalance < 0 ? "-" : "+"}${Math.abs(displayBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
