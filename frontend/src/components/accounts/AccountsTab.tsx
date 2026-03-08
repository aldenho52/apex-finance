import PlaidLinkButton from "../PlaidLink";
import type { Account } from "../../types/accounts";

interface AccountsTabProps {
  accounts: Account[];
  onBankConnected: () => void;
}

export default function AccountsTab({ accounts, onBankConnected }: AccountsTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>ALL ACCOUNTS</h3>
        <PlaidLinkButton onSuccess={onBankConnected} />
      </div>
      {accounts.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 40 }}>No accounts connected yet. Click "Connect Bank" above to link your bank.</p>
      ) : (
        accounts.map(acc => {
          const isLiability = acc.type === "credit" || acc.type === "loan";
          const typeColor = isLiability ? "#ef4444" : acc.type === "investment" ? "#22c55e" : "#60a5fa";
          const typeBg = isLiability ? "#1a0a0a" : acc.type === "investment" ? "#0a1a0a" : "#0a0a1a";
          const typeBorder = isLiability ? "#3f1515" : acc.type === "investment" ? "#153f15" : "#15153f";
          const displayBalance = isLiability ? -Math.abs(acc.balance_current) : acc.balance_current;
          return (
            <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#111318", border: "1px solid #1a1f2e", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: typeBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: typeColor, border: `1px solid ${typeBorder}` }}>
                  {acc.name.charAt(0)}
                </div>
                <div>
                  <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 500 }}>{acc.name}</p>
                  <p style={{ margin: 0, color: "#9ca3af", fontSize: 11 }}>{acc.type}{acc.subtype ? ` · ${acc.subtype}` : ""}</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, color: displayBalance < 0 ? "#ef4444" : "#22c55e", fontSize: 15, fontWeight: 700 }}>
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
