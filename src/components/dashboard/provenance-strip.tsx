"use client";

import type { Provenance } from "@/lib/types";
import { Link2, FileCheck2, Radio, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SOURCES: { label: string; provenance: Provenance; detail: string }[] = [
  { label: "totalSupply()", provenance: "onchain", detail: "RPC · trustless" },
  { label: "Transfer mint/burn", provenance: "onchain", detail: "event logs" },
  { label: "Kaiko price", provenance: "oracle", detail: "robust mid" },
  { label: "Custodian reserves", provenance: "attested", detail: "read-only API" },
  { label: "Chainlink PoR", provenance: "oracle", detail: "proof of reserve" },
  { label: "Auditor attestation", provenance: "attested", detail: "composition" },
  { label: "Chainalysis", provenance: "oracle", detail: "isSanctioned()" },
  { label: "OFAC / HKMA", provenance: "oracle", detail: "watchlists" },
  { label: "Redemption logs", provenance: "attested", detail: "p95 latency" },
  { label: "HKMA rule-pack", provenance: "config", detail: "Cap. 656" },
];

const ICON: Record<Provenance, { icon: LucideIcon; label: string }> = {
  onchain: { icon: Link2, label: "on-chain" },
  attested: { icon: FileCheck2, label: "attested" },
  oracle: { icon: Radio, label: "oracle" },
  config: { icon: SlidersHorizontal, label: "config" },
};

export function ProvenanceStrip() {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2.5 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
        Data sources · provenance
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SOURCES.map((s) => {
          const meta = ICON[s.provenance];
          return (
            <div
              key={s.label}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/20 px-3 py-2"
            >
              <meta.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs">{s.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {meta.label} · {s.detail}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
