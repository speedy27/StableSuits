"use client";

import {
  createContext,
  useContext,
  useEffect,
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

function withLiveAttestationAge(coin: Coin, now: number): Coin {
  if (!coin.attestedAt || now === 0) return coin;
  return {
    ...coin,
    attestationAgeSeconds: Math.floor(
      (now - new Date(coin.attestedAt).getTime()) / 1000,
    ),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [coinId, setCoinId] = useState(DEFAULT_COIN_ID);
  const [stress, setStressState] = useState<StressInputs>(DEFAULT_STRESS);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const coin = useMemo(() => getCoin(coinId), [coinId]);
  const liveCoin = useMemo(() => withLiveAttestationAge(coin, now), [coin, now]);

  const verdict = useMemo(() => computeVerdict(liveCoin, stress), [liveCoin, stress]);
  const liveVerdict = useMemo(
    () => computeVerdict(liveCoin, { run: 0, haircut: 0, fxShockBps: 0 }),
    [liveCoin],
  );

  const value: StoreValue = {
    coins: COINS,
    coin: liveCoin,
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
