"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/components/app/store";
import { computeVerdict } from "@/lib/verdict-engine";
import { StatusDot } from "@/components/app/status";
import { AddIssuerDialog } from "@/components/overlays/add-issuer-dialog";
import { cn, compactNumber } from "@/lib/utils";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Coin } from "@/lib/types";

export function CoinSwitcher() {
  const { coins, coin, coinId, setCoinId, removeCoin } = useStore();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group flex items-center gap-2.5 rounded-lg border border-border bg-card py-1.5 pl-2 pr-2.5 text-left transition-colors hover:bg-secondary/60">
            <CoinGlyph coin={coin} />
            <span className="leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {coin.symbol}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {coin.issuer}
              </span>
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px]">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Monitored stablecoins
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {coins.map((c) => {
            const v = computeVerdict(c, { run: 0, haircut: 0, fxShockBps: 0 });
            return (
              <DropdownMenuItem
                key={c.id}
                onClick={() => setCoinId(c.id)}
                className="group/item cursor-pointer gap-3 py-2.5"
              >
                <CoinGlyph coin={c} />
                <span className="flex-1 leading-tight">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {c.symbol}
                    <StatusDot status={v.status} />
                    {c.custom && (
                      <span className="rounded border border-border px-1 py-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">
                        onboarded
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {compactNumber(c.supply)} supply · {c.chain}
                  </span>
                </span>
                {c.custom ? (
                  <button
                    aria-label={`Remove ${c.symbol}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCoin(c.id);
                      toast(`${c.symbol} removed from supervision`);
                    }}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-fail group-hover/item:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[11px] tabular text-muted-foreground">
                    {(v.reserveRatio * 100).toFixed(1)}%
                  </span>
                )}
                {coinId === c.id && <Check className="h-3.5 w-3.5 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setAddOpen(true);
            }}
            className="cursor-pointer gap-2.5 py-2.5 text-sm font-medium"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
              <Plus className="h-4 w-4" />
            </span>
            Onboard a stablecoin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddIssuerDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function CoinGlyph({ coin }: { coin: Coin }) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-secondary text-[10px] font-semibold text-foreground",
      )}
    >
      {coin.symbol.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}
    </span>
  );
}
