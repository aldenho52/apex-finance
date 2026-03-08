import AlertCard from "./AlertCard";
import type { Alert } from "../../types/alerts";
import { colors, fontSizes } from "../../lib/theme";

interface AlertsTabProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
}

export default function AlertsTab({ alerts, onAcknowledge }: AlertsTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>PAYMENT ALERTS & INTELLIGENCE</h3>
        <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>{alerts.length} active</span>
      </div>
      {alerts.length === 0 ? (
        <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, textAlign: "center", padding: 40 }}>No active alerts. Connect a bank account to get started.</p>
      ) : (
        alerts.map(a => <AlertCard key={a.id} alert={a} onAcknowledge={onAcknowledge} />)
      )}
    </div>
  );
}
