"use client";

import { useStore } from "@/components/app/store";
import { AnimateNumber } from "@/components/ui/animate-number";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { cn, compactNumber } from "@/lib/utils";
import type { VerdictStatus, SeriesPoint } from "@/lib/types";

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--color-chart-2)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface Kpi {
  label: string;
  value: number;
  decimals: number;
  prefix?: string;
  suffix?: string;
  big?: string;
  delta: string;
  tone: VerdictStatus;
  series: number[];
}

export function KpiGrid() {
  const { coin, verdict } = useStore();
  const h: SeriesPoint[] = coin.history;

  const kpis: Kpi[] = [
    {
      label: "Reserve ratio",
      value: verdict.reserveRatio * 100,
      decimals: 2,
      suffix: "%",
      delta: `${verdict.reserveRatio >= 1 ? "+" : ""}${((verdict.reserveRatio - 1) * 100).toFixed(2)}% buffer`,
      tone: verdict.rules.find((r) => r.id === "reserve-backing")!.status,
      series: h.map((p) => p.reserveRatio),
    },
    {
      label: "Projected (stress)",
      value: verdict.projectedRatio * 100,
      decimals: 1,
      suffix: "%",
      delta: verdict.projectedRatio >= 1 ? "holds under run" : "breaks under run",
      tone: verdict.projectedRatio >= 1 ? "PASS" : verdict.projectedRatio >= 0.97 ? "WARN" : "FAIL",
      series: h.map((p) => p.projectedRatio),
    },
    {
      label: "Secondary price",
      value: coin.price,
      decimals: 4,
      prefix: coin.pegSymbol,
      delta: `${verdict.depegBps >= 0 ? "+" : ""}${verdict.depegBps} bps vs par`,
      tone: Math.abs(verdict.depegBps) < 25 ? "PASS" : Math.abs(verdict.depegBps) < 100 ? "WARN" : "FAIL",
      series: h.map((p) => p.price),
    },
    {
      label: "Reserves attested",
      value: coin.reserves,
      decimals: 0,
      big: compactNumber(coin.reserves, coin.pegSymbol),
      delta: `${compactNumber(coin.supply)} supply`,
      tone: "PASS",
      series: h.map((p) => p.reserveRatio),
    },
    {
      label: "AML flags · 24h",
      value: coin.amlFlags,
      decimals: 0,
      delta: `${compactNumber(coin.amlScreened)} screened`,
      tone: verdict.rules.find((r) => r.id === "aml-cft")!.status,
      series: h.map((_, i) => (i > 40 ? coin.amlFlags + 0.1 : 0)),
    },
    {
      label: "Redemption p95",
      value: coin.redemptionP95h,
      decimals: 1,
      suffix: "h",
      delta: "limit ≤ 24h",
      tone: verdict.rules.find((r) => r.id === "redemption-speed")!.status,
      series: h.map((p) => p.redemptions),
    },
  ];

  return (
    <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <StaggerItem key={k.label}>
          <KpiCard kpi={k} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const dot =
    kpi.tone === "PASS" ? "bg-pass" : kpi.tone === "WARN" ? "bg-warn" : "bg-fail";
  const deltaTone =
    kpi.tone === "PASS"
      ? "text-muted-foreground"
      : kpi.tone === "WARN"
        ? "text-warn"
        : "text-fail";
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {kpi.label}
        </span>
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      </div>

      <div className="mt-2 text-xl font-semibold tabular tracking-tight">
        {kpi.big ? (
          kpi.big
        ) : (
          <AnimateNumber
            value={kpi.value}
            prefix={kpi.prefix}
            suffix={kpi.suffix}
            format={{
              minimumFractionDigits: kpi.decimals,
              maximumFractionDigits: kpi.decimals,
            }}
          />
        )}
      </div>

      <div className="mt-2 h-7">
        <Sparkline data={kpi.series} />
      </div>

      <p className={cn("mt-1 text-[11px] tabular", deltaTone)}>{kpi.delta}</p>
    </div>
  );
}
