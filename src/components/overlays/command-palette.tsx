"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/app/store";
import { computeVerdict } from "@/lib/verdict-engine";
import { HKMA_CLAUSES } from "@/lib/hkma-rules";
import { compactNumber } from "@/lib/utils";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { StatusDot } from "@/components/app/status";
import { toast } from "sonner";
import {
  Coins,
  BookCheck,
  FileText,
  FlaskConical,
  ShieldCheck,
  LayoutGrid,
  Radio,
  Boxes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PAGES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/reserves", label: "Reserves", icon: Coins },
  { href: "/stress", label: "Stress lab", icon: FlaskConical },
  { href: "/compliance", label: "Compliance", icon: BookCheck },
  { href: "/aml", label: "AML signals", icon: Radio },
  { href: "/oracle", label: "Oracle & audit", icon: Boxes },
];

export function CommandPalette() {
  const router = useRouter();
  const { coins, setCoinId, resetStress } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("open-command", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command", onOpen);
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="glass-strong">
      <Command>
        <CommandInput placeholder="Search coins, pages, rules, actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Go to">
            {PAGES.map((p) => (
              <CommandItem
                key={p.href}
                value={`go ${p.label}`}
                onSelect={() => {
                  router.push(p.href);
                  setOpen(false);
                }}
              >
                <p.icon className="text-muted-foreground" />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Stablecoins">
            {coins.map((c) => {
              const v = computeVerdict(c, { run: 0, haircut: 0, fxShockBps: 0 });
              return (
                <CommandItem
                  key={c.id}
                  value={`${c.symbol} ${c.name} ${c.issuer}`}
                  onSelect={() => {
                    setCoinId(c.id);
                    setOpen(false);
                  }}
                >
                  <Coins className="text-muted-foreground" />
                  <span className="font-medium">{c.symbol}</span>
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusDot status={v.status} />
                    {compactNumber(c.supply)}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                toast.success("HKMA report queued");
                setOpen(false);
              }}
            >
              <FileText className="text-muted-foreground" />
              Generate HKMA report
            </CommandItem>
            <CommandItem
              onSelect={() => {
                resetStress();
                toast("Stress inputs reset");
                setOpen(false);
              }}
            >
              <FlaskConical className="text-muted-foreground" />
              Reset stress lab
            </CommandItem>
            <CommandItem
              onSelect={() => {
                toast.success("Verdict re-signed", {
                  description: "Fresh hash published to oracle",
                });
                setOpen(false);
              }}
            >
              <ShieldCheck className="text-muted-foreground" />
              Re-sign verdict
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="HKMA clauses">
            {HKMA_CLAUSES.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.title} ${c.clause}`}
                onSelect={() => {
                  toast(c.title, { description: c.requirement });
                  setOpen(false);
                }}
              >
                <BookCheck className="text-muted-foreground" />
                <span>{c.title}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {c.clause}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
