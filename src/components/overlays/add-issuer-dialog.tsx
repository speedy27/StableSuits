"use client";

import { useState } from "react";
import { useStore } from "@/components/app/store";
import { buildCustomCoin, type CoinOnboardInput } from "@/lib/mock-data";
import { RULE_PACKS } from "@/lib/hkma-rules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Lock, ShieldCheck } from "lucide-react";

const PEGS: { label: string; peg: string; sym: string }[] = [
  { label: "HKD", peg: "Hong Kong Dollar", sym: "HK$" },
  { label: "USD", peg: "US Dollar", sym: "US$" },
  { label: "EUR", peg: "Euro", sym: "€" },
  { label: "SGD", peg: "Singapore Dollar", sym: "S$" },
];
const CHAINS = ["Ethereum", "Polygon", "Arbitrum", "Base", "Optimism"];

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export function AddIssuerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addCoin } = useStore();

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [pegIdx, setPegIdx] = useState(0);
  const [chain, setChain] = useState(CHAINS[0]);
  const [contract, setContract] = useState("");
  const [reserveSource, setReserveSource] = useState("");
  const [rulePack, setRulePack] = useState("hkma");
  const [supply, setSupply] = useState("");
  const [reserves, setReserves] = useState("");

  const addrValid = ADDR_RE.test(contract.trim());
  const canSubmit =
    symbol.trim() &&
    name.trim() &&
    issuer.trim() &&
    addrValid &&
    Number(supply) > 0 &&
    Number(reserves) > 0;

  function reset() {
    setSymbol("");
    setName("");
    setIssuer("");
    setPegIdx(0);
    setChain(CHAINS[0]);
    setContract("");
    setReserveSource("");
    setRulePack("hkma");
    setSupply("");
    setReserves("");
  }

  function submit() {
    if (!canSubmit) return;
    const peg = PEGS[pegIdx];
    const input: CoinOnboardInput = {
      symbol: symbol.trim(),
      name: name.trim(),
      issuer: issuer.trim(),
      peg: peg.peg,
      pegSymbol: peg.sym,
      chain,
      contract: contract.trim(),
      reserveSource: reserveSource.trim() || undefined,
      rulePack,
      supply: Number(supply),
      reserves: Number(reserves),
      price: 1,
    };
    const coin = buildCustomCoin(input);
    addCoin(coin);
    toast.success(`${coin.symbol} onboarded`, {
      description: `Now monitored under ${RULE_PACKS.find((p) => p.id === rulePack)?.shortName ?? "HKMA"} · ${chain}`,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Onboard a stablecoin</DialogTitle>
          <DialogDescription>
            Add an issuer&apos;s coin to continuous supervision. Public data is read
            on-chain; reserves are pulled from the custodian endpoint.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ticker" required>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="aHKD" maxLength={8} />
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anchorpoint HKD" />
            </Field>
          </div>

          <Field label="Issuer (legal entity)" required>
            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Anchorpoint Financial Ltd" />
          </Field>

          <Field label="Contract address" required hint={contract && !addrValid ? "Must be a 0x… 40-hex address" : undefined} error={!!contract && !addrValid}>
            <Input
              value={contract}
              onChange={(e) => setContract(e.target.value)}
              placeholder="0x7a25aF1b4e09Cc2bD3F6e21d4A1c0b8E2f9D6a31"
              className="font-mono text-xs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Peg currency">
              <Segmented options={PEGS.map((p) => p.label)} value={pegIdx} onChange={setPegIdx} />
            </Field>
            <Field label="Chain">
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {CHAINS.map((c) => (
                  <option key={c} value={c} className="bg-popover">
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total supply" required>
              <Input value={supply} onChange={(e) => setSupply(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1842300000" inputMode="numeric" />
            </Field>
            <Field label="Reserves (attested)" required>
              <Input value={reserves} onChange={(e) => setReserves(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1851900000" inputMode="numeric" />
            </Field>
          </div>

          {/* FHE-encrypted reserve source */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-pass" />
              <span className="text-xs font-medium">Reserve attestation source</span>
              <span className="ml-auto rounded border border-pass/25 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-pass">
                FHE-encrypted
              </span>
            </div>
            <Input
              value={reserveSource}
              onChange={(e) => setReserveSource(e.target.value)}
              placeholder="https://custodian.api/por  ·  or Chainlink PoR feed"
              className="font-mono text-xs"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Custodian positions stay confidential — the coverage ratio is computed
              on the ciphertext, never decrypted.
            </p>
          </div>

          <Field label="Regulatory rule pack">
            <div className="flex flex-wrap gap-2">
              {RULE_PACKS.map((p) => {
                const active = rulePack === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.active}
                    onClick={() => setRulePack(p.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      active
                        ? "border-foreground/30 bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary/50",
                      !p.active && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {p.shortName}
                    {!p.active && <span className="text-[9px]">soon</span>}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            <Plus className="h-4 w-4" />
            Start monitoring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-fail">*</span>}
      </Label>
      {children}
      {hint && (
        <p className={cn("text-[10px]", error ? "text-fail" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex h-9 items-center gap-1 rounded-md border border-input p-0.5">
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(i)}
          className={cn(
            "h-full flex-1 rounded text-xs font-medium transition-colors",
            value === i
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
