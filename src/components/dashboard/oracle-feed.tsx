"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/app/store";
import { Panel } from "./panel";
import { statusMeta } from "@/components/app/status";
import { cn, shortAddress } from "@/lib/utils";
import { exportHkmaReport } from "@/lib/hkma-report";
import { AnimatePresence, motion } from "motion/react";
import { Boxes, Cpu, ShieldCheck, FileCheck2, Radio, Hash, FileDown } from "lucide-react";

interface FeedEvent {
  id: number;
  kind: "verdict" | "aml" | "attest" | "oracle";
  text: string;
  hash: string;
  at: string;
}

const KIND_ICON = {
  verdict: ShieldCheck,
  aml: Radio,
  attest: FileCheck2,
  oracle: Cpu,
} as const;

function randHash() {
  return "0x" + Math.floor(Math.random() * 0xfffffff).toString(16).padStart(7, "0");
}

export function OracleFeed() {
  const { coin, verdict } = useStore();
  const m = statusMeta[verdict.status];
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    function mk(): FeedEvent {
      const kinds: FeedEvent["kind"][] = ["verdict", "aml", "attest", "oracle"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const texts: Record<FeedEvent["kind"], string> = {
        verdict: `Verdict ${verdict.status} signed & published`,
        aml: `${Math.floor(Math.random() * 900 + 100)} addresses screened · 0 sanctioned`,
        attest: `Reserve attestation refreshed · ${((coin.reserves / coin.supply) * 100).toFixed(2)}%`,
        oracle: `Consumer guard evaluated require(PASS && fresh)`,
      };
      counter.current += 1;
      return {
        id: counter.current,
        kind,
        text: texts[kind],
        hash: randHash(),
        at: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
    }
    setEvents(Array.from({ length: 5 }, mk));
    const id = setInterval(() => setEvents((prev) => [mk(), ...prev].slice(0, 7)), 3200);
    return () => clearInterval(id);
  }, [coin, verdict.status, coin.reserves, coin.supply]);

  return (
    <Panel
      title="On-chain oracle & audit trail"
      description="The verdict humans read and machines enforce"
      icon={Boxes}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportHkmaReport(coin, verdict)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileDown className="h-3 w-3" />
            HKMA report (PDF)
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            <Hash className="h-3 w-3" />
            {verdict.hash}
          </span>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-foreground">StableSuiteConsumer.sol</span>
            <span className={cn("text-[11px] font-medium uppercase", m.text)}>
              {verdict.status === "PASS" ? "accepts" : "reverts"}
            </span>
          </div>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
            <code>
              {"function "}
              <span className="text-foreground">acceptCollateral</span>
              {"(address coin) {\n  require(\n    "}
              <span className={m.text}>verdict.status == PASS && verdict.fresh</span>
              {"\n  );\n  "}
              <span className={verdict.status !== "PASS" ? "text-fail" : "text-foreground"}>
                {verdict.status === "PASS" ? "// collateral accepted" : "// reverted: not trusted"}
              </span>
              {"\n}"}
            </code>
          </pre>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live events</p>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-pass" />
              streaming
            </span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {events.map((e) => {
                const Icon = KIND_ICON[e.kind];
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate text-xs">{e.text}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{shortAddress(e.hash)}</span>
                    <span className="shrink-0 font-mono text-[10px] tabular text-muted-foreground/60">{e.at}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Panel>
  );
}
