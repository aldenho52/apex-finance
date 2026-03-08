import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useAccounts } from "./hooks/useAccounts";
import { useAlerts } from "./hooks/useAlerts";
import { fetchRentalSummary } from "./lib/api";
import { colors, fonts, fontSizes, spacing, radius } from "./lib/theme";
import StatusDot from "./components/ui/StatusDot";
import AlertsTab from "./components/alerts/AlertsTab";
import AccountsTab from "./components/accounts/AccountsTab";
import RentalTab from "./components/rental/RentalTab";
import DebtTab from "./components/debt/DebtTab";
import CashFlowHeader from "./components/cashflow/CashFlowHeader";
import LearningTab from "./components/learning/LearningTab";
import AiChat from "./components/chat/AiChat";
import PlaidLinkButton from "./components/PlaidLink";

const TABS = ["alerts", "accounts", "debt", "rental", "learn"] as const;

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { accounts, netWorth, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { alerts, criticalCount, acknowledgeAlert, refresh: refreshAlerts } = useAlerts();
  const [tab, setTab] = useState<string>("alerts");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rental, setRental] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState("just now");

  useEffect(() => {
    fetchRentalSummary().then(setRental).catch(() => {});
  }, []);

  const handleBankConnected = () => {
    refreshAccounts();
    refreshAlerts();
    setLastUpdated("just now");
  };

  const totalDebt = accounts
    .filter(a => a.type === "credit")
    .reduce((s, a) => s + Math.abs(a.balance_current || 0), 0);

  const tabStyle = (t: string) => ({
    padding: "10px 20px",
    borderRadius: radius.button,
    fontSize: fontSizes.small,
    fontWeight: 600 as const,
    cursor: "pointer" as const,
    letterSpacing: "0.04em",
    background: tab === t ? colors.elevatedBg : "transparent",
    border: tab === t ? `1px solid ${colors.border}` : "1px solid transparent",
    color: tab === t ? colors.textPrimary : colors.textTertiary,
    fontFamily: fonts.body,
    transition: "all 0.15s ease",
  });

  if (accountsLoading) {
    return (
      <div style={{ fontFamily: fonts.body, background: colors.pageBg, minHeight: "100vh", color: colors.textTertiary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fontSizes.body }}>
        Loading your data...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: fonts.body, background: colors.pageBg, minHeight: "100vh", color: colors.textPrimary }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.pageBg, position: "sticky", top: 0, zIndex: 50, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusDot color={colors.brand} pulse />
          <span style={{ fontFamily: fonts.brand, fontWeight: 800, fontSize: 16, letterSpacing: "0.2em" }}>APEX</span>
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 500 }}>/ FINANCE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {criticalCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: colors.negativeBg, border: `1px solid ${colors.negativeBorder}`, borderRadius: radius.badge, padding: "5px 12px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors.negative, animation: "pulse 1.5s infinite" }} />
              <span style={{ color: colors.negative, fontSize: fontSizes.caption, fontWeight: 600 }}>{criticalCount} CRITICAL</span>
            </div>
          )}
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Updated {lastUpdated || "—"}</span>
          <button
            onClick={() => navigate("/settings")}
            style={{ background: "transparent", border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "5px 12px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}
          >
            Settings
          </button>
          <button
            onClick={signOut}
            style={{ background: "transparent", border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "5px 12px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
        {/* Cash Flow Header */}
        <CashFlowHeader netWorth={netWorth} accountCount={accounts.length} totalDebt={totalDebt} alertCount={alerts.length} criticalCount={criticalCount} />

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: spacing.cardGap }}>
          {/* Left */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {TABS.map(t => (
                <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                  {t.toUpperCase()}{t === "alerts" && criticalCount > 0 ? ` (${criticalCount})` : ""}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding, minHeight: 400 }} className="fade-up" key={tab}>
              {tab === "alerts" && <AlertsTab alerts={alerts} onAcknowledge={acknowledgeAlert} />}
              {tab === "accounts" && <AccountsTab accounts={accounts} onBankConnected={handleBankConnected} />}
              {tab === "debt" && <DebtTab />}
              {tab === "rental" && <RentalTab rental={rental} />}
              {tab === "learn" && <LearningTab />}
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AiChat />
            {accounts.length === 0 && (
              <div style={{ background: colors.infoBg, border: `1px solid ${colors.infoBorder}`, borderRadius: radius.card, padding: spacing.cardPadding, textAlign: "center" }}>
                <p style={{ margin: "0 0 10px", color: colors.info, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em" }}>GET STARTED</p>
                <p style={{ margin: "0 0 14px", color: colors.textSecondary, fontSize: fontSizes.small, lineHeight: 1.6 }}>Connect your bank account to unlock alerts, balance tracking, and AI-powered financial insights.</p>
                <PlaidLinkButton onSuccess={handleBankConnected} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
