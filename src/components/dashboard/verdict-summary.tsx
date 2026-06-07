"use client";

import { useStore } from "@/components/app/store";
import { statusMeta } from "@/components/app/status";
import { RatingBadge } from "./rating-badge";
import { AnimateNumber } from "@/components/ui/animate-number";
import { cn, relativeTime } from "@/lib/utils";
import { ShieldCheck, Droplets, Hash, Clock } from "lucide-react";

export function VerdictSummary() {
  const { coin, verdict } = useStore();
  const m = statusMeta[verdict.status];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid lg:grid-cols-[1.2fr_1fr]">
        <div className="relative border-b border-border p-6 lg:border-b-0 lg:border-r">
          <span className={cn("absolute left-0 top-6 h-[calc(100%-3rem)] w-0.5 rounded-full", m.dot)} />
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", m.dot)} />
            <span className={cn("text-xs font-medium uppercase tracking-[0.14em]", m.text)}>
              {verdict.status} · {m.label}
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
            {coin.name} is{" "}
            <span className={verdict.clean ? "text-foreground" : "text-fail"}>
              {verdict.clean ? "clean" : "not clean"}
            </span>{" "}
            and{" "}
            <span className={verdict.solvent ? "text-foreground" : "text-fail"}>
              {verdict.solvent ? "solvent" : "not solvent"}
            </span>
            .
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            One signed verdict — AML and reserves in a single answer, read by
            humans, enforced on-chain by machines.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <DualBadge ok={verdict.clean} icon={ShieldCheck} label="Clean" sub={`${verdict.amlFlags} AML flags`} />
            <DualBadge ok={verdict.solvent} icon={Droplets} label="Solvent" sub={`${(verdict.projectedRatio * 100).toFixed(1)}% stressed`} />
            <RatingBadge rating={verdict.rating} score={verdict.score} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span className="font-mono">{verdict.hash}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              attested {relativeTime(coin.attestationAgeSeconds)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Figure
            label="Reserve ratio"
            value={verdict.reserveRatio * 100}
            decimals={2}
            suffix="%"
            tone={verdict.reserveRatio >= 1 ? "pass" : "fail"}
            big
          />
          <Figure
            label="Projected (stress)"
            value={verdict.projectedRatio * 100}
            decimals={1}
            suffix="%"
            tone={verdict.projectedRatio >= 1 ? "pass" : verdict.projectedRatio >= 0.97 ? "warn" : "fail"}
            big
          />
          <Figure
            label="Depeg"
            value={verdict.depegBps}
            decimals={0}
            suffix=" bps"
            tone={Math.abs(verdict.depegBps) < 25 ? "pass" : Math.abs(verdict.depegBps) < 100 ? "warn" : "fail"}
          />
          <Figure
            label="Confidence"
            value={verdict.confidence * 100}
            decimals={0}
            suffix="%"
            tone="muted"
          />
        </div>
      </div>
    </section>
  );
}

function DualBadge({
  ok,
  icon: Icon,
  label,
  sub,
}: {
  ok: boolean;
  icon: typeof ShieldCheck;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <Icon className={cn("h-4 w-4", ok ? "text-pass" : "text-fail")} strokeWidth={1.75} />
      <span className="leading-tight">
        <span className="block text-sm font-medium">
          {ok ? label : `Not ${label.toLowerCase()}`}
        </span>
        <span className="block text-[11px] tabular text-muted-foreground">{sub}</span>
      </span>
    </div>
  );
}

function Figure({
  label,
  value,
  decimals,
  suffix,
  tone,
  big,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix: string;
  tone: "pass" | "warn" | "fail" | "muted";
  big?: boolean;
}) {
  const toneClass =
    tone === "warn" ? "text-warn" : tone === "fail" ? "text-fail" : "text-foreground";
  return (
    <div className="flex flex-col justify-center border-b border-border p-5 last:border-b-0 [&:nth-last-child(-n+2)]:border-b-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "mt-1 font-semibold tabular tracking-tight",
          big ? "text-3xl" : "text-xl",
          toneClass,
        )}
      >
        <AnimateNumber
          value={value}
          format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
          suffix={suffix}
        />
      </span>
    </div>
  );
}
