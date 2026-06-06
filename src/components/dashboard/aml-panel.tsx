"use client";

import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { cn, compactNumber, shortAddress } from "@/lib/utils";
import { Radio, ShieldCheck, ShieldAlert } from "lucide-react";

const SOURCES = ["Chainalysis oracle", "OFAC SDN", "HKMA / SFC watchlist"];

function deriveAddresses(flags: number) {
  const base = [
    "0x40C5aACa6Cf38A1a0C4F3a8b27cD9aF1B2e8aC8f",
    "0x9c2bF0a83Dd4112e7A6B5c0E1f234a5B6c7D8e90",
    "0x1aB2c3D4e5F60718293A4b5C6d7E8f9012345678",
    "0x7f6E5d4C3b2A19087f6E5d4c3B2a190887654321",
  ];
  return base.map((addr, i) => ({
    addr,
    risk: i < flags ? "Sanctioned" : i === flags ? "Review" : "Clean",
  }));
}

export function AmlPanel() {
  const { coin, verdict } = useStore();
  const clean = verdict.clean;
  const rows = deriveAddresses(coin.amlFlags);

  return (
    <Panel
      title="AML / sanctions screening"
      description="Continuous transaction monitoring"
      icon={Radio}
      action={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
            clean ? "border-pass/25 text-pass" : "border-fail/25 text-fail",
          )}
        >
          {clean ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {clean ? "Clean" : `${coin.amlFlags} flagged`}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Screened · 24h
          </span>
          <span className="mt-0.5 block text-xl font-semibold tabular">
            {compactNumber(coin.amlScreened)}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Sanctioned hits
          </span>
          <span className={cn("mt-0.5 block text-xl font-semibold tabular", coin.amlFlags === 0 ? "text-foreground" : "text-fail")}>
            {coin.amlFlags}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-2 py-1 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            {s}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Recent screened
        </p>
        <div className="space-y-0.5">
          {rows.map((r) => (
            <div key={r.addr} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-secondary/40">
              <span className="font-mono text-muted-foreground">{shortAddress(r.addr)}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  r.risk === "Sanctioned" && "text-fail",
                  r.risk === "Review" && "text-warn",
                  r.risk === "Clean" && "text-muted-foreground",
                )}
              >
                {r.risk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
