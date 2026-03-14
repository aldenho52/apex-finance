export type PlayImpact = "HIGH" | "MEDIUM" | "QUICK_WIN";

export interface Play {
  play_id: string;
  title: string;
  description: string;
  impact: PlayImpact;
  reward_amount: number;
  reward_timeframe: string;
  time_to_complete: string;
  category: string;
  cta_label: string;
}

export interface ImpactStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

export const IMPACT_STYLES: Record<PlayImpact, ImpactStyle> = {
  HIGH: {
    bg: "rgba(52, 211, 153, 0.08)",
    border: "rgba(52, 211, 153, 0.25)",
    text: "#34d399",
    label: "HIGH IMPACT",
  },
  MEDIUM: {
    bg: "rgba(96, 165, 250, 0.08)",
    border: "rgba(96, 165, 250, 0.25)",
    text: "#60a5fa",
    label: "MEDIUM",
  },
  QUICK_WIN: {
    bg: "rgba(251, 191, 36, 0.08)",
    border: "rgba(251, 191, 36, 0.25)",
    text: "#fbbf24",
    label: "QUICK WIN",
  },
};
