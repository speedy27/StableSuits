"use client";

import { CoinSwitcher } from "./coin-switcher";
import { LiveClock } from "./live-clock";
import { Logo } from "@/components/brand/logo";
import { useStore } from "@/components/app/store";
import { statusMeta } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, FileText, Command } from "lucide-react";
import { toast } from "sonner";

export function Topbar() {
  const { verdict, coin } = useStore();
  const m = statusMeta[verdict.status];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="lg:hidden">
          <Logo showWord={false} />
        </div>

        <CoinSwitcher />

        <div
          className={cn(
            "hidden items-center gap-2 rounded-full border px-2.5 py-1 text-xs md:inline-flex",
            m.bg,
            m.border,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
          <span className={m.text}>{verdict.status}</span>
          <span className="font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
            {verdict.hash}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command"))}
            className="hidden items-center gap-2 rounded-lg border border-border bg-card py-1.5 pl-3 pr-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search…</span>
            <kbd className="ml-3 inline-flex items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <span className="hidden md:block">
            <LiveClock />
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast.success("HKMA report generated", {
                description: `${coin.symbol} · reserves-vs-supply · signed ${verdict.hash}`,
              })
            }
            className="hidden gap-2 sm:inline-flex"
          >
            <FileText className="h-4 w-4" strokeWidth={1.75} />
            Report
          </Button>
        </div>
      </div>
    </header>
  );
}
