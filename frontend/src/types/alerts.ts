export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: number;
  severity: AlertSeverity;
  title: string;
  message: string;
  amount: number | null;
  due_date: string | null;
  action: string | null;
  alert_type: string;
  acknowledged: boolean;
}

export interface SeverityStyle {
  bg: string;
  border: string;
  dot: string;
  text: string;
  badge: string;
}

export const SEVERITY_STYLES: Record<AlertSeverity, SeverityStyle> = {
  critical: { bg: "#1a0505", border: "#7f1d1d", dot: "#ef4444", text: "#fca5a5", badge: "URGENT" },
  warning: { bg: "#1a1205", border: "#78350f", dot: "#f59e0b", text: "#fcd34d", badge: "WARNING" },
  info: { bg: "#030f1f", border: "#1e3a5f", dot: "#60a5fa", text: "#93c5fd", badge: "INFO" },
};
