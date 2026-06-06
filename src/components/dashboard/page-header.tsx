"use client";

import { useStore } from "@/components/app/store";
import { compactNumber, shortAddress } from "@/lib/utils";
import { StatusPill } from "@/components/app/status";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { coin, verdict } = useStore();
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>StableSuite</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground">{title}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={verdict.status} />
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Supply </span>
          <span className="tabular font-medium">
            {compactNumber(coin.supply, coin.pegSymbol)}
          </span>
        </div>
        <div className="hidden rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground sm:block">
          {shortAddress(coin.contract)}
        </div>
      </div>
    </div>
  );
}
