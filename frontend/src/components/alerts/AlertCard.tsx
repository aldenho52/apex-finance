import StatusDot from "../ui/StatusDot";
import type { Alert } from "../../types/alerts";
import { SEVERITY_STYLES } from "../../types/alerts";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (id: number) => void;
}

export default function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const c = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <StatusDot color={c.dot} pulse={alert.severity === "critical"} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: c.text, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>{c.badge}</span>
            <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{alert.title}</span>
          </div>
          <p style={{ color: "#d1d5db", fontSize: 12, lineHeight: 1.5, margin: 0 }}>{alert.message}</p>
          {alert.amount && (
            <p style={{ color: c.text, fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              ${Number(alert.amount).toLocaleString()} {alert.due_date ? `· Due ${alert.due_date}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => onAcknowledge(alert.id)}
          style={{ background: "transparent", border: `1px solid ${c.border}`, borderRadius: 6, padding: "5px 10px", color: c.text, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >
          {alert.action || "Dismiss"}
        </button>
      </div>
    </div>
  );
}
