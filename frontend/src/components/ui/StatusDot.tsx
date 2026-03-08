interface StatusDotProps {
  color: string;
  pulse?: boolean;
  size?: number;
}

export default function StatusDot({ color, pulse = false, size = 8 }: StatusDotProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: pulse ? `0 0 8px ${color}` : "none",
        animation: pulse ? "pulse 2s infinite" : "none",
      }}
    />
  );
}
