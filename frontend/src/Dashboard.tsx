import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useAccounts } from "./hooks/useAccounts";
import { useAlerts } from "./hooks/useAlerts";
import { fetchRentalSummary } from "./lib/api";
import StatusDot from "./components/ui/StatusDot";
import AlertsTab from "./components/alerts/AlertsTab";
import AccountsTab from "./components/accounts/AccountsTab";
import RentalTab from "./components/rental/RentalTab";
import DebtTab from "./components/debt/DebtTab";
import LearningTab from "./components/learning/LearningTab";
import AiChat from "./components/chat/AiChat";
import PlaidLinkButton from "./components/PlaidLink";
import { useEffect } from "react";

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
    padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" as const, letterSpacing: "0.05em",
    background: tab === t ? "rgba(59,130,246,0.15)" : "transparent",
    border: tab === t ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
    color: tab === t ? "#93c5fd" : "#9ca3af",
    fontFamily: "inherit",
  });

  if (accountsLoading) {
    return (
      <div style={{ fontFamily: "'DM Mono', monospace", background: "#08090d", minHeight: "100vh", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
        Loading your data...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#08090d", minHeight: "100vh", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1f2937;border-radius:2px}
        input::placeholder{color:#6b7280}
        button:hover{opacity:0.8!important}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #111827", background: "#08090d", position: "sticky", top: 0, zIndex: 50, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusDot color="#22c55e" pulse />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.2em" }}>APEX</span>
          <span style={{ color: "#6b7280", fontSize: 11 }}>/ FINANCE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {criticalCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
              <span style={{ color: "#fca5a5", fontSize: 10, fontWeight: 700 }}>{criticalCount} CRITICAL</span>
            </div>
          )}
          <span style={{ color: "#6b7280", fontSize: 10 }}>Updated {lastUpdated || "—"}</span>
          <button
            onClick={() => navigate("/settings")}
            style={{ background: "transparent", border: "1px solid #1f2937", borderRadius: 6, padding: "4px 10px", color: "#9ca3af", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Settings
          </button>
          <button
            onClick={signOut}
            style={{ background: "transparent", border: "1px solid #1f2937", borderRadius: 6, padding: "4px 10px", color: "#9ca3af", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "NET WORTH", value: `$${netWorth.toLocaleString()}`, sub: accounts.length ? `${accounts.length} accounts` : "connect bank", color: "#22c55e" },
            { label: "MONTHLY INCOME", value: "—", sub: "connect bank", color: "#60a5fa" },
            { label: "TOTAL DEBT", value: `$${totalDebt.toLocaleString()}`, sub: "credit cards", color: "#f87171" },
            { label: "ACTIVE ALERTS", value: `${alerts.length}`, sub: criticalCount ? `${criticalCount} critical` : "none critical", color: "#a78bfa" },
          ].map(item => (
            <div key={item.label} style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 10, padding: "14px" }}>
              <p style={{ color: "#9ca3af", fontSize: 9, letterSpacing: "0.12em", marginBottom: 6, fontWeight: 700 }}>{item.label}</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
              <p style={{ color: "#6b7280", fontSize: 10, marginTop: 3 }}>{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Left */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {TABS.map(t => (
                <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                  {t.toUpperCase()}{t === "alerts" && criticalCount > 0 ? ` (${criticalCount})` : ""}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 16, minHeight: 400 }} className="fade-up" key={tab}>
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
              <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ margin: "0 0 10px", color: "#93c5fd", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>GET STARTED</p>
                <p style={{ margin: "0 0 14px", color: "#d1d5db", fontSize: 12, lineHeight: 1.5 }}>Connect your bank account to unlock alerts, balance tracking, and AI-powered financial insights.</p>
                <PlaidLinkButton onSuccess={handleBankConnected} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
