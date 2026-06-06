"use client";

import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ReserveChart() {
  const { coin, verdict } = useStore();

  const data = coin.history.map((p) => ({
    t: p.t,
    Reserve: +(p.reserveRatio * 100).toFixed(2),
    Projected: +(p.projectedRatio * 100).toFixed(2),
  }));

  const lo = Math.floor(Math.min(...data.map((d) => d.Projected)) - 1);
  const hi = Math.ceil(Math.max(...data.map((d) => d.Reserve)) + 1);

  return (
    <Panel
      title="Reserve coverage"
      description="Live ratio (R/S) vs stress-projected ratio · last 48 ticks"
      icon={LineChartIcon}
      action={
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <Legend label="Live" />
          <Legend label="Projected" dashed />
        </div>
      }
      contentClassName="p-4 sm:p-5"
    >
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="resFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
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
              domain={[lo, hi]}
              ticks={Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((_, i, a) => a.length <= 6 || i % 2 === 0)}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={42}
            />
            <ReferenceLine y={100} stroke="var(--color-foreground)" strokeOpacity={0.3} strokeDasharray="4 4" />
            <ReferenceLine
              y={99}
              stroke="var(--color-fail)"
              strokeOpacity={0.45}
              strokeDasharray="2 4"
              label={{ value: "0.99 break-the-buck", position: "insideBottomRight", fontSize: 9, fill: "var(--color-fail)" }}
            />
            <Tooltip content={<ChartTip />} />
            <Area
              type="monotone"
              dataKey="Projected"
              stroke="var(--color-chart-3)"
              strokeWidth={1.4}
              strokeDasharray="5 4"
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="Reserve"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              fill="url(#resFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-xs">
        <span className="text-muted-foreground">Gap to projected (stress overlay)</span>
        <span className="tabular font-medium">
          {((verdict.reserveRatio - verdict.projectedRatio) * 100).toFixed(1)} pts
        </span>
      </div>
    </Panel>
  );
}

function Legend({ label, dashed }: { label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-4 rounded-full"
        style={{
          background: dashed
            ? "repeating-linear-gradient(90deg, var(--color-chart-3) 0 4px, transparent 4px 7px)"
            : "var(--color-foreground)",
        }}
      />
      {label}
    </span>
  );
}

interface TipPayload {
  name: string;
  value: number;
}
function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-mono text-[10px] text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-3 tabular">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium">{p.value}%</span>
        </p>
      ))}
    </div>
  );
}
