import StatusDot from "../ui/StatusDot";
import { useChat } from "../../hooks/useChat";

export default function AiChat() {
  const { messages, chatInput, setChatInput, chatLoading, sendMessage, messagesEndRef } = useChat();

  return (
    <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", height: 400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 10, borderBottom: "1px solid #111827", marginBottom: 10 }}>
        <StatusDot color="#22c55e" pulse />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>APEX AI</span>
        <span style={{ color: "#6b7280", fontSize: 10 }}>· always online</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {messages.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: 11, textAlign: "center", padding: 20 }}>Ask APEX anything about your finances.</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }} className="fade-up">
            <div style={{
              maxWidth: "88%", padding: "8px 11px", borderRadius: 9, fontSize: 11.5, lineHeight: 1.55,
              background: msg.role === "user" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${msg.role === "user" ? "rgba(59,130,246,0.25)" : "#1a1f2e"}`,
              color: msg.role === "user" ? "#93c5fd" : "#d1d5db",
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 9 }}>
              <span style={{ color: "#9ca3af", fontSize: 14 }}>···</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about your finances..."
          style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 7, padding: "8px 11px", color: "white", fontSize: 12, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={sendMessage} style={{ background: "#1d4ed8", border: "none", borderRadius: 7, padding: "8px 13px", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>→</button>
      </div>
    </div>
  );
}
