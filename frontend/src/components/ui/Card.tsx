import type { CSSProperties, ReactNode } from "react";
import { colors, spacing, radius } from "../../lib/theme";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export default function Card({ children, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: spacing.cardPadding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
