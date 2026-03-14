import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { colors, fonts, fontSizes, spacing, radius } from "../../lib/theme";
import { calcCompoundGrowth, formatCurrency, formatAxisValue } from "../../lib/growth-math";

const fmt = formatCurrency;
const fmtAxis = formatAxisValue;

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  display: string;
}

function Slider({ label, min, max, step, value, onChange, display }: SliderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: fontSizes.caption,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: fonts.body,
        }}
      >
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: colors.positive }}
      />
      <span
        style={{
          fontSize: fontSizes.h3,
          fontWeight: 600,
          color: colors.textPrimary,
          fontFamily: fonts.body, fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  green?: boolean;
}

function StatCard({ label, value, subtitle, green }: StatCardProps) {
  return (
    <div
      style={{
        background: colors.elevatedBg,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.button,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: fontSizes.caption,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
          fontFamily: fonts.body,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: green ? colors.positive : colors.textPrimary,
          fontFamily: fonts.body, fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: fontSizes.caption,
            color: colors.textMuted,
            marginTop: 4,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function CompoundCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(30);
  const [monthly, setMonthly] = useState(500);

  const data = useMemo(
    () => calcCompoundGrowth(principal, rate, years, monthly),
    [principal, rate, years, monthly]
  );

  const final = data[data.length - 1].balance;
  const totalIn = data[data.length - 1].contributed;
  const earned = final - totalIn;

  return (
    <div>
      {/* Sliders */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: spacing.cardGap,
          marginBottom: spacing.sectionGap,
        }}
      >
        <Slider
          label="Initial investment"
          min={1000}
          max={100000}
          step={1000}
          value={principal}
          onChange={setPrincipal}
          display={`$${principal.toLocaleString()}`}
        />
        <Slider
          label="Annual return rate"
          min={1}
          max={20}
          step={0.5}
          value={rate}
          onChange={setRate}
          display={`${rate}%`}
        />
        <Slider
          label="Time horizon"
          min={1}
          max={50}
          step={1}
          value={years}
          onChange={setYears}
          display={`${years} years`}
        />
        <Slider
          label="Monthly contributions"
          min={0}
          max={5000}
          step={100}
          value={monthly}
          onChange={setMonthly}
          display={`$${monthly.toLocaleString()}/mo`}
        />
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: spacing.sectionGap,
        }}
      >
        <StatCard label="Final balance" value={fmt(final)} subtitle={`at year ${years}`} />
        <StatCard label="Total contributed" value={fmt(totalIn)} subtitle="your money in" />
        <StatCard label="Interest earned" value={fmt(earned)} subtitle="money made on money" green />
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 10 }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.positive} stopOpacity={0.25} />
                <stop offset="95%" stopColor={colors.positive} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.positive} stopOpacity={0.1} />
                <stop offset="95%" stopColor={colors.positive} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: colors.textMuted, fontSize: fontSizes.caption }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(1, Math.floor(years / 8))}
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
              formatter={((v: number, name: string) => [
                fmt(v || 0),
                name === "balance" ? "With returns" : "Contributions only",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ]) as any}
            />
            <Area
              type="monotone"
              dataKey="contributed"
              stroke={colors.textMuted}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#gradContrib)"
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={colors.positive}
              strokeWidth={2}
              fill="url(#gradBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20 }}>
        {[
          { color: colors.positive, label: "Compound growth" },
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
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
              }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
