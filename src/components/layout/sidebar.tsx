"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { RULE_PACKS } from "@/lib/hkma-rules";
import {
  LayoutGrid,
  Coins,
  FlaskConical,
  BookCheck,
  Radio,
  Boxes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/", icon: LayoutGrid, label: "Overview" },
  { href: "/reserves", icon: Coins, label: "Reserves" },
  { href: "/stress", icon: FlaskConical, label: "Stress lab" },
  { href: "/compliance", icon: BookCheck, label: "Compliance" },
  { href: "/aml", icon: Radio, label: "AML signals" },
  { href: "/oracle", icon: Boxes, label: "Oracle & audit" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[244px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
          Monitor
        </p>
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={1.75}
              />
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
          Rule packs
        </p>
        <div className="space-y-0.5">
          {RULE_PACKS.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  p.active ? "bg-pass" : "bg-muted-foreground/40",
                )}
              />
              <span className={cn(p.active ? "text-foreground" : "text-muted-foreground")}>
                {p.shortName}
              </span>
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/60">
                {p.active ? "Live" : "Soon"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
