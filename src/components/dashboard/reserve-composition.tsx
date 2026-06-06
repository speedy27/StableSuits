"use client";

import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { hqlaShare } from "@/lib/verdict-engine";
import { cn } from "@/lib/utils";
import { PieChart as PieIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const RAMP = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

export function ReserveComposition() {
  const { coin } = useStore();
  const hqla = hqlaShare(coin);
  const data = coin.reserveComposition.map((d, i) => ({
    ...d,
    fill: d.hqla ? RAMP[i % RAMP.length] : "var(--color-warn)",
  }));

  return (
    <Panel
      title="Reserve composition"
      description="Eligibility under HKMA HQLA rules"
      icon={PieIcon}
      action={
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] tabular",
            hqla >= 0.95 ? "border-pass/25 text-pass" : "border-warn/25 text-warn",
          )}
        >
          {(hqla * 100).toFixed(0)}% HQLA
        </span>
      }
    >
      <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]">
        <div className="relative mx-auto h-[150px] w-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={50}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <span className="text-2xl font-semibold tabular tracking-tight">
                {(hqla * 100).toFixed(0)}%
              </span>
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                eligible
              </span>
            </div>
          </div>
        </div>

        <ul className="space-y-2.5">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2.5 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.fill }} />
              <span className="flex-1 truncate text-muted-foreground">{d.label}</span>
              {!d.hqla && (
                <span className="rounded border border-warn/25 px-1.5 py-0.5 text-[9px] font-medium uppercase text-warn">
                  non-HQLA
                </span>
              )}
              <span className="font-medium tabular">{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
