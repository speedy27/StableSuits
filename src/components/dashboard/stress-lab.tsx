"use client";

import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { projectedRatio } from "@/lib/verdict-engine";
import { AnimateNumber } from "@/components/ui/animate-number";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { FlaskConical, RotateCcw } from "lucide-react";

const SCENARIOS: { name: string; run: number; haircut: number; fx: number }[] = [
  { name: "Calm", run: 0.05, haircut: 0.01, fx: 0 },
  { name: "SVB-style", run: 0.2, haircut: 0.05, fx: 0 },
  { name: "Bank run", run: 0.45, haircut: 0.1, fx: 25 },
  { name: "Black swan", run: 0.7, haircut: 0.18, fx: 80 },
];

export function StressLab() {
  const { coin, stress, setStress, resetStress } = useStore();
  const proj = projectedRatio(coin, stress);
  const projPct = proj * 100;
  const status = proj >= 1 ? "pass" : proj >= 0.97 ? "warn" : "fail";
  const gaugePct = Math.max(0, Math.min(1, (proj - 0.7) / 0.4));

  return (
    <Panel
      title="Stress lab"
      description="Predict solvency under a redemption run"
      icon={FlaskConical}
      action={
        <button
          onClick={resetStress}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      }
    >
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Projected ratio
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-3xl font-semibold tabular tracking-tight",
                  status === "pass" && "text-foreground",
                  status === "warn" && "text-warn",
                  status === "fail" && "text-fail",
                )}
              >
                <AnimateNumber value={projPct} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="%" />
              </span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  status === "pass" && "border-pass/30 text-pass",
                  status === "warn" && "border-warn/30 text-warn",
                  status === "fail" && "border-fail/30 text-fail",
                )}
              >
                {status === "pass" ? "Solvent" : status === "warn" ? "Fragile" : "Breach"}
              </span>
            </div>
          </div>
          <span className="text-right text-[11px] text-muted-foreground">
            live
            <span className="mt-0.5 block text-base font-medium tabular text-foreground">
              {((coin.reserves / coin.supply) * 100).toFixed(2)}%
            </span>
          </span>
        </div>

        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="absolute left-[75%] top-0 z-10 h-full w-px bg-foreground/40" />
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              status === "pass" && "bg-foreground",
              status === "warn" && "bg-warn",
              status === "fail" && "bg-fail",
            )}
            style={{ width: `${gaugePct * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
          <span>0.70</span>
          <span>1.00 par</span>
          <span>1.10</span>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <StressSlider label="Redemption run" hint="ρ" value={stress.run} min={0} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(run) => setStress({ run })} />
        <StressSlider label="Fire-sale haircut" hint="h" value={stress.haircut} min={0} max={0.25} step={0.005} format={(v) => `${(v * 100).toFixed(1)}%`} onChange={(haircut) => setStress({ haircut })} />
        <StressSlider label="FX / peg shock" hint="bps" value={stress.fxShockBps} min={0} max={150} step={5} format={(v) => `${v} bps`} onChange={(fxShockBps) => setStress({ fxShockBps })} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Scenarios</p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => {
            const active = Math.abs(stress.run - s.run) < 0.001 && Math.abs(stress.haircut - s.haircut) < 0.0001;
            return (
              <button
                key={s.name}
                onClick={() => setStress({ run: s.run, haircut: s.haircut, fxShockBps: s.fx })}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors",
                  active
                    ? "border-foreground/30 bg-secondary text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <span className="font-medium">{s.name}</span>
                <span className="font-mono text-[10px] opacity-70">{Math.round(s.run * 100)}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-center font-mono text-[10px] text-muted-foreground">
        proj = ( R·(1−h)·fx − ρ·S ) / ( S·(1−ρ) )
      </p>
    </Panel>
  );
}

function StressSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm">
          {label}
          <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{hint}</span>
        </span>
        <span className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-xs tabular">
          {format(value)}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
