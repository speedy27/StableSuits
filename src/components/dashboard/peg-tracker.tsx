"use client";

import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { Activity } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Peg Stability Tracker — overlays the market-price deviation (Depeg, bps) on
 * the stress-projected solvency (LSR, %). The thesis: the market re-prices risk
 * on-chain *before* the reserve ratio formally breaks par, so a widening depeg
 * is an early-warning signal that precedes a coverage breach.
 */
export function PegTracker() {
  const { coin } = useStore();

  const data = coin.history.map((p) => ({
    t: p.t,
    Depeg: +((p.price - 1) * 10_000).toFixed(1),
    LSR: +(p.projectedRatio * 100).toFixed(2),
  }));

  const depAbsMax = Math.max(25, ...data.map((d) => Math.abs(d.Depeg)));
  const depDomain: [number, number] = [-Math.ceil(depAbsMax * 1.15), Math.ceil(depAbsMax * 1.15)];

  const lsrLo = Math.floor(Math.min(...data.map((d) => d.LSR)) - 1);
  const lsrHi = Math.ceil(Math.max(...data.map((d) => d.LSR)) + 1);

  const latest = data[data.length - 1];

  return (
    <Panel
      title="Peg stability tracker"
      description="Market depeg (bps) leads stress-projected coverage (LSR) · last 48 ticks"
      icon={Activity}
      action={
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <Legend label="Depeg" color="var(--color-chart-2)" />
          <Legend label="LSR" color="var(--color-foreground)" />
        </div>
      }
      contentClassName="p-4 sm:p-5"
    >
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="pegFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 6" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={9}
            />
            <YAxis
              yAxisId="depeg"
              domain={depDomain}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
              width={42}
            />
            <YAxis
              yAxisId="lsr"
              orientation="right"
              domain={[lsrLo, lsrHi]}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <ReferenceLine yAxisId="depeg" y={0} stroke="var(--color-border)" />
            <ReferenceLine
              yAxisId="lsr"
              y={100}
              stroke="var(--color-foreground)"
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
            <ReferenceLine
              yAxisId="depeg"
              y={-50}
              stroke="var(--color-fail)"
              strokeOpacity={0.4}
              strokeDasharray="2 4"
              label={{ value: "−50bps watch", position: "insideBottomLeft", fontSize: 9, fill: "var(--color-fail)" }}
            />
            <Tooltip content={<PegTip />} />
            <Area
              yAxisId="depeg"
              type="monotone"
              dataKey="Depeg"
              stroke="var(--color-chart-2)"
              strokeWidth={1.6}
              fill="url(#pegFill)"
            />
            <Line
              yAxisId="lsr"
              type="monotone"
              dataKey="LSR"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-2.5">
          <span className="text-muted-foreground">Current depeg</span>
          <span className="tabular font-medium">
            {latest.Depeg > 0 ? "+" : ""}
            {latest.Depeg} bps
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-2.5">
          <span className="text-muted-foreground">Stress LSR</span>
          <span className="tabular font-medium">{latest.LSR}%</span>
        </div>
      </div>
    </Panel>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function PegTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-mono text-[10px] text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular font-medium text-foreground">
            {p.name === "Depeg" ? `${p.value > 0 ? "+" : ""}${p.value} bps` : `${p.value}%`}
          </span>
        </div>
      ))}
    </div>
  );
}
