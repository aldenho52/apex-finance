import { useState, useEffect, useRef } from "react";

const MOCK_DATA = {
  user: { name: "Alden", netWorth: 47820, monthlyIncome: 11250, lastUpdated: "2 min ago" },
  accounts: [
    { id: 1, name: "Chase Checking", type: "checking", balance: 4821.44, institution: "Chase" },
    { id: 2, name: "Chase Sapphire Reserve", type: "credit", balance: -2340.00, limit: 10000, apr: 21.99, penaltyApr: 29.99, dueDate: "2026-03-04", minPayment: 35 },
    { id: 3, name: "Citi Double Cash", type: "credit", balance: -890.00, limit: 8000, apr: 19.99, penaltyApr: 29.99, dueDate: "2026-03-11", minPayment: 25 },
    { id: 4, name: "Roth IRA (Fidelity)", type: "investment", balance: 18200 },
    { id: 5, name: "HYSA (Marcus)", type: "savings", balance: 12400, apy: 4.75 },
  ],
  alerts: [
    { id: 1, severity: "critical", title: "Chase Sapphire Due in 6 Days", message: "Balance $2,340 due Mar 4. Miss this → $40 late fee + APR spikes from 21.99% to 29.99%. That's $187/yr extra on your current balance.", amount: 2340, dueDate: "Mar 4", action: "Pay Now" },
    { id: 2, severity: "critical", title: "Penalty APR Watch Active", message: "Late payment detected 43 days ago. You've made 2 on-time payments since — eligible to call Chase and request APR reset. Works ~70% of the time.", action: "View Script" },
    { id: 3, severity: "warning", title: "Citi Double Cash Due in 13 Days", message: "Balance $890 due Mar 11. Your checking covers full balance — pay in full to avoid $178/yr in interest at 19.99%.", amount: 890, dueDate: "Mar 11", action: "Schedule" },
    { id: 4, severity: "warning", title: "Adobe CC Price Increase Detected", message: "Charge jumped $54.99 → $59.99 this month (+$60/yr). Last used 18 days ago. Worth keeping?", action: "Review" },
    { id: 5, severity: "info", title: "Mesa Rent Not Yet Received", message: "March rent ($1,650) typically deposits around the 1st. Not yet showing. Verify with tenant.", amount: 1650, action: "Check" },
  ],
  rental: {
    address: "Mesa, AZ",
    purchasePrice: 285000, currentValue: 318000, equity: 67400,
    mortgage: { balance: 250600, rate: 3.25, payment: 1205, principal: 273, interest: 932 },
    rent: 1650, marketRent: 1895,
    expenses: { insurance: 95, taxes: 187 },
    verdict: "MONITOR", cashFlow: -869, effectiveCost: -557,
    appreciation12mo: 4.2, depreciationBenefit: 312,
    annualRentGap: 2940,
  },
  carnivore: {
    streak: 47, todayProtein: 180, targetProtein: 220,
    todayFat: 142, targetFat: 160,
    weeklySpend: 127, weeklyBudget: 138, lastMeal: "Ribeye + 3 eggs",
  },
  subscriptions: [
    { name: "Netflix", amount: 22.99, lastUsed: "2 days ago", status: "active" },
    { name: "Adobe CC", amount: 59.99, lastUsed: "18 days ago", status: "warning" },
    { name: "Spotify", amount: 11.99, lastUsed: "today", status: "active" },
    { name: "Gym", amount: 89.00, lastUsed: "yesterday", status: "active" },
  ],
};

const sev = {
  critical: { bg: "#1a0505", border: "#7f1d1d", dot: "#ef4444", text: "#fca5a5", badge: "URGENT" },
  warning:  { bg: "#1a1205", border: "#78350f", dot: "#f59e0b", text: "#fcd34d", badge: "WARNING" },
  info:     { bg: "#030f1f", border: "#1e3a5f", dot: "#60a5fa", text: "#93c5fd", badge: "INFO" },
};

function Dot({ color, pulse }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
      boxShadow: pulse ? `0 0 8px ${color}` : "none",
      animation: pulse ? "pulse 2s infinite" : "none"
    }} />
  );
}

function AlertCard({ alert }) {
  const c = sev[alert.severity];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Dot color={c.dot} pulse={alert.severity === "critical"} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: c.text, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>{c.badge}</span>
            <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{alert.title}</span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5, margin: 0 }}>{alert.message}</p>
          {alert.amount && <p style={{ color: c.text, fontSize: 13, fontWeight: 700, marginTop: 4 }}>${alert.amount.toLocaleString()} {alert.dueDate ? `· Due ${alert.dueDate}` : ""}</p>}
        </div>
        <button style={{ background: "transparent", border: `1px solid ${c.border}`, borderRadius: 6, padding: "5px 10px", color: c.text, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          {alert.action}
        </button>
      </div>
    </div>
  );
}

function Bar({ value, max, color }) {
  return (
    <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min((value/max)*100,100)}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("alerts");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", text: "Morning Alden — you have 2 critical payment alerts. Your Chase card is due in 6 days and your penalty APR may still be active. Want me to walk through the priority actions?" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const d = MOCK_DATA;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || loading) return;
    const msg = chatInput;
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    
    const responses = {
      "chase": "Your Chase Sapphire has $2,340 due in 6 days. Your checking has $4,821 — you can comfortably pay the full balance. Do it now to avoid both the $40 late fee AND the 29.99% penalty APR which may already be active from your previous late payment.",
      "rental": "Mesa is your biggest decision point right now. You're losing $557/mo effectively (after the depreciation tax shield). The market's up 4.2% trailing 12mo which partially offsets it. But you're also charging $245/mo below market rent — raise to $1,895 at next lease renewal. That alone improves your cash flow by $2,940/yr.",
      "carnivore": "You're at 180g protein, 40g short of your 220g target. Easiest fix: add a pound of 80/20 ground beef tonight (~80g protein, 70g fat). You're 5 days ahead on streak — keep it clean.",
      "default": "Based on your current picture: your biggest immediate move is paying Chase in full this week to kill the late fee risk. Then call them about the penalty APR reset. After that, look at raising your Mesa rent at lease renewal — that's $2,940/yr you're leaving on the table."
    };
    
    await new Promise(r => setTimeout(r, 900));
    const key = Object.keys(responses).find(k => msg.toLowerCase().includes(k)) || "default";
    setMessages(prev => [...prev, { role: "ai", text: responses[key] }]);
    setLoading(false);
  };

  const totalDebt = d.accounts.filter(a => a.type === "credit").reduce((s, a) => s + Math.abs(a.balance), 0);
  const criticalCount = d.alerts.filter(a => a.severity === "critical").length;

  const tabStyle = (t) => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em",
    background: tab === t ? "rgba(59,130,246,0.15)" : "transparent",
    border: tab === t ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
    color: tab === t ? "#93c5fd" : "#4b5563",
  });

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#08090d", minHeight: "100vh", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1f2937;border-radius:2px}
        input::placeholder{color:#374151}
        button:hover{opacity:0.8!important}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #111827", background: "#08090d", position: "sticky", top: 0, zIndex: 50, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Dot color="#22c55e" pulse />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.2em" }}>APEX</span>
          <span style={{ color: "#1f2937", fontSize: 11 }}>/ FINANCE + HEALTH OS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {criticalCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
              <span style={{ color: "#fca5a5", fontSize: 10, fontWeight: 700 }}>{criticalCount} CRITICAL</span>
            </div>
          )}
          <span style={{ color: "#1f2937", fontSize: 10 }}>Updated {d.user.lastUpdated}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "NET WORTH", value: `$${d.user.netWorth.toLocaleString()}`, sub: "▲ +$2,140 mo", color: "#22c55e" },
            { label: "MONTHLY INCOME", value: `$${d.user.monthlyIncome.toLocaleString()}`, sub: "W2 + rental", color: "#60a5fa" },
            { label: "TOTAL DEBT", value: `$${totalDebt.toLocaleString()}`, sub: "credit cards", color: "#f87171" },
            { label: "MONTHLY SAVINGS", value: "$1,910", sub: "after all expenses", color: "#a78bfa" },
            { label: "CARNIVORE STREAK", value: `${d.carnivore.streak} days`, sub: "keep it up", color: "#fb923c" },
          ].map(item => (
            <div key={item.label} style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 10, padding: "14px" }}>
              <p style={{ color: "#374151", fontSize: 9, letterSpacing: "0.12em", marginBottom: 6, fontWeight: 700 }}>{item.label}</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
              <p style={{ color: "#1f2937", fontSize: 10, marginTop: 3 }}>{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Left */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["alerts", "accounts", "subscriptions", "rental"].map(t => (
                <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                  {t.toUpperCase()}{t === "alerts" && criticalCount > 0 ? ` (${criticalCount})` : ""}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 16, minHeight: 400 }} className="fade-up" key={tab}>
              
              {tab === "alerts" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>PAYMENT ALERTS & INTELLIGENCE</h3>
                    <span style={{ color: "#374151", fontSize: 11 }}>{d.alerts.length} active</span>
                  </div>
                  {d.alerts.map(a => <AlertCard key={a.id} alert={a} />)}
                </div>
              )}

              {tab === "accounts" && (
                <div>
                  <h3 style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>ALL ACCOUNTS</h3>
                  {d.accounts.map(acc => (
                    <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#111318", border: "1px solid #1a1f2e", borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: acc.type === "credit" ? "#1a0a0a" : acc.type === "investment" ? "#0a1a0a" : "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: acc.type === "credit" ? "#ef4444" : acc.type === "investment" ? "#22c55e" : "#60a5fa", border: `1px solid ${acc.type === "credit" ? "#3f1515" : acc.type === "investment" ? "#153f15" : "#15153f"}` }}>
                          {acc.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 500 }}>{acc.name}</p>
                          <p style={{ margin: 0, color: "#374151", fontSize: 11 }}>
                            {acc.type}{acc.apr ? ` · ${acc.apr}% APR` : ""}{acc.apy ? ` · ${acc.apy}% APY` : ""}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, color: acc.balance < 0 ? "#ef4444" : "#22c55e", fontSize: 15, fontWeight: 700 }}>
                          {acc.balance < 0 ? "-" : "+"}${Math.abs(acc.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        {acc.dueDate && <p style={{ margin: 0, color: "#ef4444", fontSize: 10 }}>Due {new Date(acc.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "subscriptions" && (
                <div>
                  <h3 style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>RECURRING CHARGES AUDIT</h3>
                  <div style={{ background: "#0a0c10", border: "1px solid #1f2937", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: 12 }}>Total recurring: <span style={{ color: "white", fontWeight: 700 }}>${d.subscriptions.reduce((s,x)=>s+x.amount,0).toFixed(2)}/mo</span> · <span style={{ color: "#f59e0b" }}>$1 potential savings from unused services</span></p>
                  </div>
                  {d.subscriptions.map(sub => (
                    <div key={sub.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: sub.status === "warning" ? "#1a1205" : "#111318", border: `1px solid ${sub.status === "warning" ? "#78350f" : "#1a1f2e"}`, borderRadius: 8, marginBottom: 8 }}>
                      <div>
                        <p style={{ margin: 0, color: "white", fontSize: 13, fontWeight: 500 }}>{sub.name}</p>
                        <p style={{ margin: 0, color: "#374151", fontSize: 11 }}>Last used: {sub.lastUsed}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, color: sub.status === "warning" ? "#fcd34d" : "#9ca3af", fontSize: 13, fontWeight: 600 }}>${sub.amount}/mo</p>
                        <p style={{ margin: 0, color: "#374151", fontSize: 10 }}>${(sub.amount * 12).toFixed(0)}/yr</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "rental" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>RENTAL INTELLIGENCE</h3>
                      <p style={{ margin: "3px 0 0", color: "#374151", fontSize: 11 }}>{d.rental.address}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{d.rental.verdict}</span>
                      <p style={{ margin: 0, color: "#374151", fontSize: 10 }}>Current Verdict</p>
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[
                      { l: "Equity", v: `$${(d.rental.equity/1000).toFixed(0)}K`, c: "#22c55e" },
                      { l: "Effective Loss", v: `-$${Math.abs(d.rental.effectiveCost)}/mo`, c: "#f87171" },
                      { l: "Appreciation", v: `+${d.rental.appreciation12mo}%`, c: "#60a5fa" },
                    ].map(x => (
                      <div key={x.l} style={{ background: "#111318", borderRadius: 8, padding: "12px", textAlign: "center" }}>
                        <p style={{ margin: 0, color: x.c, fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{x.v}</p>
                        <p style={{ margin: "3px 0 0", color: "#374151", fontSize: 10 }}>{x.l}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                    <p style={{ margin: 0, color: "#fcd34d", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>⚡ RENT OPPORTUNITY</p>
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: 12 }}>Market rent is <span style={{ color: "white", fontWeight: 700 }}>${d.rental.marketRent}/mo</span>. You charge <span style={{ color: "#fcd34d", fontWeight: 700 }}>${d.rental.rent}</span>. Raise at next renewal = <span style={{ color: "#22c55e", fontWeight: 700 }}>+${d.rental.annualRentGap.toLocaleString()}/yr</span>.</p>
                  </div>

                  {[
                    ["Mortgage P+I", `-$${d.rental.mortgage.payment}/mo`, `$${d.rental.mortgage.principal} principal · $${d.rental.mortgage.interest} interest`],
                    ["Insurance + Taxes", `-$${d.rental.expenses.insurance + d.rental.expenses.taxes}/mo`, null],
                    ["Depreciation Shield", `+$${d.rental.depreciationBenefit}/mo tax benefit`, null],
                    ["Effective Monthly Cost", `-$${Math.abs(d.rental.effectiveCost)}/mo`, "after all benefits"],
                  ].map(([label, val, sub]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: label === "Effective Monthly Cost" ? "none" : "1px solid #111827" }}>
                      <span style={{ color: label === "Effective Monthly Cost" ? "#9ca3af" : "#4b5563", fontSize: 12, fontWeight: label === "Effective Monthly Cost" ? 700 : 400 }}>{label}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: label === "Depreciation Shield" ? "#22c55e" : label === "Effective Monthly Cost" ? "#f87171" : "#6b7280", fontSize: 12, fontWeight: label === "Effective Monthly Cost" ? 700 : 400 }}>{val}</span>
                        {sub && <p style={{ margin: 0, color: "#1f2937", fontSize: 10 }}>{sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* AI Chat */}
            <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", height: 300 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 10, borderBottom: "1px solid #111827", marginBottom: 10 }}>
                <Dot color="#22c55e" pulse />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>APEX AI</span>
                <span style={{ color: "#1f2937", fontSize: 10 }}>· always online</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }} className="fade-up">
                    <div style={{
                      maxWidth: "88%", padding: "8px 11px", borderRadius: 9, fontSize: 11.5, lineHeight: 1.55,
                      background: msg.role === "user" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${msg.role === "user" ? "rgba(59,130,246,0.25)" : "#1a1f2e"}`,
                      color: msg.role === "user" ? "#93c5fd" : "#9ca3af"
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 9 }}>
                      <span style={{ color: "#374151", fontSize: 14 }}>···</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Ask about your finances..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 7, padding: "8px 11px", color: "white", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                />
                <button onClick={sendMessage} style={{ background: "#1d4ed8", border: "none", borderRadius: 7, padding: "8px 13px", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>→</button>
              </div>
            </div>

            {/* Carnivore */}
            <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>CARNIVORE</h3>
                  <p style={{ margin: "3px 0 0", color: "#374151", fontSize: 11 }}>Last: {d.carnivore.lastMeal}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#f97316" }}>{d.carnivore.streak}</span>
                  <p style={{ margin: 0, color: "#374151", fontSize: 9, letterSpacing: "0.1em" }}>DAY STREAK</p>
                </div>
              </div>
              {[
                { l: "Protein", cur: d.carnivore.todayProtein, max: d.carnivore.targetProtein, unit: "g", c: "#f97316" },
                { l: "Fat", cur: d.carnivore.todayFat, max: d.carnivore.targetFat, unit: "g", c: "#eab308" },
                { l: "Food Spend", cur: d.carnivore.weeklySpend, max: d.carnivore.weeklyBudget, unit: "$", c: "#22c55e", prefix: "$" },
              ].map(x => (
                <div key={x.l} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "#4b5563", fontSize: 11 }}>{x.l}</span>
                    <span style={{ color: "#6b7280", fontSize: 11 }}>{x.prefix || ""}{x.cur}{x.unit} / {x.prefix || ""}{x.max}{x.unit}</span>
                  </div>
                  <Bar value={x.cur} max={x.max} color={x.c} />
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #111827" }}>
                <p style={{ margin: "0 0 7px", color: "#374151", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>QUICK LOG</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {["Ribeye", "Gr. Beef", "Eggs", "Liver", "Salmon", "Brisket"].map(food => (
                    <button key={food} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 5, padding: "4px 8px", color: "#4b5563", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>+ {food}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* NJ Move Tax Box */}
            <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12, padding: 14 }}>
              <p style={{ margin: "0 0 6px", color: "#4ade80", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>💡 NYC → NJ MOVE SAVINGS</p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 12, lineHeight: 1.5 }}>Eliminating NYC city tax (~3.8%) saves you approx. <span style={{ color: "#22c55e", fontWeight: 700 }}>$5,130/yr</span> on your $135K salary. Cherry Hill move = immediate raise.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
