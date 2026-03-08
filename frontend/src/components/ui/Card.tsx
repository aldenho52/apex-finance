import type { CSSProperties, ReactNode } from "react";

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
        background: "#0d0f14",
        border: "1px solid #111827",
        borderRadius: 12,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
