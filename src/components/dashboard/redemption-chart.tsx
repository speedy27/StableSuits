"use client";

import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { compactNumber } from "@/lib/utils";
import { Waves } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function RedemptionChart() {
  const { coin } = useStore();
  const data = coin.history.map((p) => ({ t: p.t, redemptions: p.redemptions }));
  const avg = data.reduce((a, b) => a + b.redemptions, 0) / data.length;
  const peak = Math.max(...data.map((d) => d.redemptions));
  const spiking = peak > avg * 2.2;

  return (
    <Panel
      title="Redemption flow"
      description="Early-warning signal for a run"
      icon={Waves}
      action={
        spiking ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/25 px-2.5 py-1 text-[11px] text-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-warn" />
            Surge
          </span>
        ) : (
          <span className="rounded-full border border-pass/25 px-2.5 py-1 text-[11px] text-pass">
            Nominal
          </span>
        )
      }
    >
      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="t"
              tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={11}
            />
            <Tooltip
              cursor={{ fill: "var(--color-secondary)", opacity: 0.5 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-xl">
                    <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
                    <span className="block font-medium tabular">
                      {compactNumber(Number(payload[0].value))} redeemed
                    </span>
                  </div>
                );
              }}
            />
            <Bar dataKey="redemptions" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.redemptions > avg * 2.2 ? "var(--color-warn)" : "var(--color-chart-2)"}
                  fillOpacity={d.redemptions > avg * 1.5 ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="24h avg" value={compactNumber(avg)} />
        <Stat label="Peak tick" value={compactNumber(peak)} />
        <Stat label="p95 latency" value={`${coin.redemptionP95h.toFixed(1)}h`} />
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 py-2">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="block text-sm font-medium tabular">{value}</span>
    </div>
  );
}
