"use client";

import { useState } from "react";
import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { statusMeta } from "@/components/app/status";
import { HKMA_CLAUSES } from "@/lib/hkma-rules";
import { cn } from "@/lib/utils";
import type { RuleResult } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BookCheck, Check, AlertTriangle, X, ChevronRight, Code2, ScrollText, Quote } from "lucide-react";

const ICON = { PASS: Check, WARN: AlertTriangle, FAIL: X } as const;

export function ComplianceChecklist({ compact = false }: { compact?: boolean }) {
  const { verdict } = useStore();
  const [selected, setSelected] = useState<RuleResult | null>(null);

  const pass = verdict.rules.filter((r) => r.status === "PASS").length;
  const total = verdict.rules.length;
  const clause = selected ? HKMA_CLAUSES.find((c) => c.id === selected.id) : null;
  const rules = compact
    ? [...verdict.rules].sort((a, b) => rank(b.status) - rank(a.status)).slice(0, 6)
    : verdict.rules;

  return (
    <>
      <Panel
        title="HKMA compliance — checked as code"
        description="Stablecoins Ordinance Cap. 656 · each clause is a machine-checkable rule"
        icon={BookCheck}
        action={
          <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs tabular">
            <span className="text-foreground">{pass}</span>
            <span className="text-muted-foreground"> / {total}</span>
          </span>
        }
      >
        <div className={cn("grid gap-2", !compact && "md:grid-cols-2")}>
          {rules.map((r) => {
            const m = statusMeta[r.status];
            const Icon = ICON[r.status];
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/40"
              >
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md border", m.bg, m.text, m.border)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.clause}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={cn("block text-xs font-medium tabular", m.text)}>{r.value}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">{r.threshold}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </Panel>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="glass-strong w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected && clause && (
            <>
              <SheetHeader className="border-b border-border">
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-md border", statusMeta[selected.status].bg, statusMeta[selected.status].text, statusMeta[selected.status].border)}>
                    {(() => {
                      const I = ICON[selected.status];
                      return <I className="h-4 w-4" />;
                    })()}
                  </span>
                  <div>
                    <SheetTitle>{selected.label}</SheetTitle>
                    <SheetDescription className="font-mono text-[11px]">
                      {selected.clause}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <DrawerStat label="Observed" value={selected.value} status={selected.status} />
                  <DrawerStat label="Required" value={selected.threshold} />
                </div>
                <Block icon={ScrollText} title="Requirement">
                  <p className="text-sm leading-relaxed text-muted-foreground">{clause.requirement}</p>
                </Block>
                <Block icon={Code2} title="Machine check">
                  <code className="block rounded-lg border border-border bg-secondary/40 px-3 py-2.5 font-mono text-xs">
                    {clause.check}
                  </code>
                </Block>
                <Block icon={Quote} title="Citation">
                  <p className="text-xs italic text-muted-foreground">{clause.citation}</p>
                </Block>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function rank(s: RuleResult["status"]) {
  return s === "FAIL" ? 2 : s === "WARN" ? 1 : 0;
}

function DrawerStat({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: RuleResult["status"];
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("mt-0.5 block text-sm font-medium tabular", status && statusMeta[status].text)}>
        {value}
      </span>
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Code2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}
