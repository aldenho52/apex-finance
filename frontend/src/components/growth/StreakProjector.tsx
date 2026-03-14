import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { colors, fonts, fontSizes, spacing, radius } from "../../lib/theme";
import type { StreakSnapshot } from "../../types/growth";

interface StreakProjectorProps {
  history: StreakSnapshot[];
  loading: boolean;
  period: "30d" | "12m";
  onPeriodChange: (p: "30d" | "12m") => void;
}

interface ChartPoint {
  label: string;
  balance: number | null;
  projected: number | null;
  contributed: number | null;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
const fmtAxis = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`;

function deriveProjection(
  history: StreakSnapshot[],
  yearsOut: number
): {
  chartData: ChartPoint[];
  avgMonthly: number;
  impliedRate: number;
  finalBalance: number;
} {
  if (history.length < 2) {
    return { chartData: [], avgMonthly: 0, impliedRate: 0, finalBalance: 0 };
  }

  const first = history[0];
  const last = history[history.length - 1];
  const months = Math.max(1, history.length - 1);

  const totalContributed = history.reduce((sum, s) => sum + s.contributed, 0);
  const gains = last.balance - first.balance - totalContributed;
  const impliedRate =
    first.balance > 0 ? (gains / first.balance) * (12 / months) * 100 : 7;
  const avgMonthly = totalContributed / months;

  // Historical points
  const chartData: ChartPoint[] = history.map((s) => ({
    label: new Date(s.date).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    balance: Math.round(s.balance),
    projected: null,
    contributed: null,
  }));

  // Bridge point — last historical is also first projected
  const bridgeLabel = chartData[chartData.length - 1].label;
  chartData[chartData.length - 1] = {
    ...chartData[chartData.length - 1],
    projected: Math.round(last.balance),
  };

  // Future projection
  const r = Math.max(0, impliedRate) / 100 / 12;
  const projMonths = yearsOut * 12;
  const interval = Math.max(1, Math.round(projMonths / 20));
  let finalBalance = last.balance;

  for (let m = interval; m <= projMonths; m += interval) {
    const fv =
      last.balance * Math.pow(1 + r, m) +
      (r > 0 ? avgMonthly * (Math.pow(1 + r, m) - 1) / r : avgMonthly * m);
    const contribOnly =
      last.balance + avgMonthly * m;
    const futureDate = new Date(last.date);
    futureDate.setMonth(futureDate.getMonth() + m);
    const label = futureDate.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    chartData.push({
      label,
      balance: null,
      projected: Math.round(fv),
      contributed: Math.round(contribOnly),
    });
    finalBalance = fv;
  }

  return {
    chartData,
    avgMonthly: Math.round(avgMonthly),
    impliedRate: Math.round(impliedRate * 10) / 10,
    finalBalance: Math.round(finalBalance),
  };
}

export default function StreakProjector({
  history,
  loading,
  period,
  onPeriodChange,
}: StreakProjectorProps) {
  const [yearsOut, setYearsOut] = useState(10);

  const { chartData, avgMonthly, impliedRate, finalBalance } = useMemo(
    () => deriveProjection(history, yearsOut),
    [history, yearsOut]
  );

  const todayLabel = useMemo(() => {
    if (history.length === 0) return "";
    const last = history[history.length - 1];
    return new Date(last.date).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }, [history]);

  const toggleStyle = useCallback(
    (active: boolean) => ({
      padding: "6px 14px",
      borderRadius: radius.badge,
      fontSize: fontSizes.caption,
      fontWeight: 600 as const,
      cursor: "pointer" as const,
      border: active ? `1px solid ${colors.positiveBorder}` : `1px solid ${colors.border}`,
      background: active ? colors.positiveBg : "transparent",
      color: active ? colors.positive : colors.textTertiary,
      fontFamily: fonts.body,
      letterSpacing: "0.04em",
    }),
    []
  );

  if (loading) {
    return (
      <p
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.small,
          textAlign: "center",
          padding: 40,
        }}
      >
        Loading investment history...
      </p>
    );
  }

  if (history.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, marginBottom: 8 }}>
          Not enough investment data yet.
        </p>
        <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>
          Connect a bank account with investment or depository accounts to see your growth streak.
        </p>
      </div>
    );
  }

  const currentBalance = history[history.length - 1].balance;

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.cardGap,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <button style={toggleStyle(period === "30d")} onClick={() => onPeriodChange("30d")}>
            PAST 30 DAYS
          </button>
          <button style={toggleStyle(period === "12m")} onClick={() => onPeriodChange("12m")}>
            PAST 12 MONTHS
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: fontSizes.caption,
              color: colors.textTertiary,
              fontFamily: fonts.body,
            }}
          >
            Project
          </span>
          <select
            value={yearsOut}
            onChange={(e) => setYearsOut(+e.target.value)}
            style={{
              background: colors.elevatedBg,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.input,
              padding: "5px 10px",
              color: colors.textPrimary,
              fontSize: fontSizes.small,
              fontFamily: fonts.body,
              cursor: "pointer",
            }}
          >
            {[5, 10, 15, 20, 30].map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: spacing.sectionGap,
        }}
      >
        <div style={statBoxStyle}>
          <div style={statLabelStyle}>Current balance</div>
          <div style={statValueStyle}>{fmt(currentBalance)}</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statLabelStyle}>Avg monthly</div>
          <div style={statValueStyle}>{fmt(avgMonthly)}/mo</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statLabelStyle}>Implied return</div>
          <div style={statValueStyle}>{impliedRate}%/yr</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statLabelStyle}>Projected at Y{yearsOut}</div>
          <div style={{ ...statValueStyle, color: colors.positive }}>{fmt(finalBalance)}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 10 }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.info} stopOpacity={0.2} />
                <stop offset="95%" stopColor={colors.info} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.positive} stopOpacity={0.2} />
                <stop offset="95%" stopColor={colors.positive} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: colors.textMuted, fontSize: fontSizes.caption }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fill: colors.textMuted, fontSize: fontSizes.caption }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                background: colors.elevatedBg,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.button,
                fontSize: fontSizes.small,
                fontFamily: fonts.body,
                color: colors.textPrimary,
              }}
              labelStyle={{ color: colors.textTertiary }}
              formatter={((v: number | null, name: string) => {
                if (v === null || v === undefined) return ["-", ""];
                const label =
                  name === "balance"
                    ? "Actual"
                    : name === "projected"
                    ? "Projected"
                    : "Contributions only";
                return [fmt(v || 0), label];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any}
            />
            {todayLabel && (
              <ReferenceLine
                x={todayLabel}
                stroke={colors.textMuted}
                strokeDasharray="3 3"
                label={{
                  value: "Today",
                  position: "top",
                  fill: colors.textTertiary,
                  fontSize: fontSizes.caption,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="contributed"
              stroke={colors.textMuted}
              strokeWidth={1}
              strokeDasharray="4 3"
              fill="none"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={colors.info}
              strokeWidth={2}
              fill="url(#gradHistorical)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke={colors.positive}
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#gradProjected)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16 }}>
        {[
          { color: colors.info, label: "Historical", dashed: false },
          { color: colors.positive, label: "Projected", dashed: true },
          { color: colors.textMuted, label: "Contributions only", dashed: true },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: fontSizes.caption,
              color: colors.textTertiary,
              fontFamily: fonts.body,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

const statBoxStyle: React.CSSProperties = {
  background: colors.elevatedBg,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.button,
  padding: "12px 14px",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: fontSizes.caption,
  color: colors.textTertiary,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  fontFamily: fonts.body,
};

const statValueStyle: React.CSSProperties = {
  fontSize: fontSizes.h3,
  fontWeight: 600,
  color: colors.textPrimary,
  fontFamily: fonts.body,
  fontVariantNumeric: "tabular-nums",
};
