// APEX Finance — Design Tokens
// Single source of truth for all colors, fonts, spacing, and radius values.

export const colors = {
  // Backgrounds
  pageBg: "#0c0f16",
  cardBg: "#131720",
  elevatedBg: "#1a1e2a",
  border: "#1e2536",

  // Text
  textPrimary: "#f0f2f5",
  textSecondary: "#a8b1bf",
  textTertiary: "#6b7584",
  textMuted: "#4a5264",

  // Accent — green-forward for wealth
  positive: "#34d399",
  negative: "#f87171",
  warning: "#fbbf24",
  info: "#60a5fa",

  // Semantic
  brand: "#34d399",
  brandGlow: "0 0 8px #34d399",
  link: "#60a5fa",

  // Status backgrounds (subtle tints)
  positiveBg: "rgba(52, 211, 153, 0.08)",
  positiveBorder: "rgba(52, 211, 153, 0.2)",
  negativeBg: "rgba(248, 113, 113, 0.08)",
  negativeBorder: "rgba(248, 113, 113, 0.2)",
  warningBg: "rgba(251, 191, 36, 0.08)",
  warningBorder: "rgba(251, 191, 36, 0.2)",
  infoBg: "rgba(96, 165, 250, 0.08)",
  infoBorder: "rgba(96, 165, 250, 0.2)",
} as const;

export const fonts = {
  body: "'Inter', system-ui, -apple-system, sans-serif",
  brand: "'Syne', sans-serif",
  mono: "'DM Mono', 'Courier New', monospace",
} as const;

export const fontSizes = {
  h1: 24,
  h2: 18,
  h3: 14,
  body: 13,
  small: 12,
  caption: 11,
} as const;

export const spacing = {
  cardPadding: 20,
  cardGap: 16,
  sectionGap: 20,
} as const;

export const radius = {
  card: 12,
  button: 8,
  input: 8,
  badge: 20,
} as const;
