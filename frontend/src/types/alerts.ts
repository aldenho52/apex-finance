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
  critical: { bg: "rgba(248, 113, 113, 0.06)", border: "rgba(248, 113, 113, 0.2)", dot: "#f87171", text: "#fca5a5", badge: "URGENT" },
  warning: { bg: "rgba(251, 191, 36, 0.06)", border: "rgba(251, 191, 36, 0.2)", dot: "#fbbf24", text: "#fcd34d", badge: "WARNING" },
  info: { bg: "rgba(96, 165, 250, 0.06)", border: "rgba(96, 165, 250, 0.2)", dot: "#60a5fa", text: "#93c5fd", badge: "INFO" },
};
