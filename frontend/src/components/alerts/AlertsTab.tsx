import AlertCard from "./AlertCard";
import type { Alert } from "../../types/alerts";

interface AlertsTabProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
}

export default function AlertsTab({ alerts, onAcknowledge }: AlertsTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>PAYMENT ALERTS & INTELLIGENCE</h3>
        <span style={{ color: "#9ca3af", fontSize: 11 }}>{alerts.length} active</span>
      </div>
      {alerts.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 40 }}>No active alerts. Connect a bank account to get started.</p>
      ) : (
        alerts.map(a => <AlertCard key={a.id} alert={a} onAcknowledge={onAcknowledge} />)
      )}
    </div>
  );
}
