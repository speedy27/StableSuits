"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COINS, DEFAULT_COIN_ID, getCoin } from "@/lib/mock-data";
import { computeVerdict, DEFAULT_STRESS } from "@/lib/verdict-engine";
import type { Coin, StressInputs, Verdict } from "@/lib/types";

interface StoreValue {
  coins: Coin[];
  coin: Coin;
  coinId: string;
  setCoinId: (id: string) => void;
  stress: StressInputs;
  setStress: (s: Partial<StressInputs>) => void;
  resetStress: () => void;
  verdict: Verdict;
  liveVerdict: Verdict;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [coinId, setCoinId] = useState(DEFAULT_COIN_ID);
  const [stress, setStressState] = useState<StressInputs>(DEFAULT_STRESS);

  const coin = useMemo(() => getCoin(coinId), [coinId]);
  const verdict = useMemo(() => computeVerdict(coin, stress), [coin, stress]);
  const liveVerdict = useMemo(
    () => computeVerdict(coin, { run: 0, haircut: 0, fxShockBps: 0 }),
    [coin],
  );

  const value: StoreValue = {
    coins: COINS,
    coin,
    coinId,
    setCoinId,
    stress,
    setStress: (s) => setStressState((prev) => ({ ...prev, ...s })),
    resetStress: () => setStressState(DEFAULT_STRESS),
    verdict,
    liveVerdict,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
