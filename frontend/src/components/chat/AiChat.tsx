import StatusDot from "../ui/StatusDot";
import { useChat } from "../../hooks/useChat";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

export default function AiChat() {
  const { messages, chatInput, setChatInput, chatLoading, sendMessage, messagesEndRef } = useChat();

  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: 16, display: "flex", flexDirection: "column", height: 400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 10, borderBottom: `1px solid ${colors.border}`, marginBottom: 10 }}>
        <StatusDot color={colors.brand} pulse />
        <span style={{ fontSize: fontSizes.caption, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>APEX AI</span>
        <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>· always online</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {messages.length === 0 && (
          <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, textAlign: "center", padding: 20 }}>Ask APEX anything about your finances.</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }} className="fade-up">
            <div style={{
              maxWidth: "88%", padding: "9px 12px", borderRadius: 10, fontSize: fontSizes.small, lineHeight: 1.6,
              fontFamily: msg.role === "user" ? fonts.body : fonts.mono,
              background: msg.role === "user" ? colors.infoBg : colors.elevatedBg,
              border: `1px solid ${msg.role === "user" ? colors.infoBorder : colors.border}`,
              color: msg.role === "user" ? colors.info : colors.textSecondary,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "9px 14px", background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
              <span style={{ color: colors.textTertiary, fontSize: fontSizes.h3 }}>···</span>
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
          style={{ flex: 1, background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "9px 12px", color: colors.textPrimary, fontSize: fontSizes.small, outline: "none", fontFamily: fonts.body }}
        />
        <button onClick={sendMessage} style={{ background: "#1d6b45", border: "none", borderRadius: radius.button, padding: "9px 14px", color: "white", fontSize: fontSizes.body, fontWeight: 700, cursor: "pointer", fontFamily: fonts.body }}>→</button>
      </div>
    </div>
  );
}
