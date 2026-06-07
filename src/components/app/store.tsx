"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COINS, DEFAULT_COIN_ID } from "@/lib/mock-data";
import { computeVerdict, DEFAULT_STRESS } from "@/lib/verdict-engine";
import type { Coin, StressInputs, Verdict } from "@/lib/types";

interface StoreValue {
  coins: Coin[];
  coin: Coin;
  coinId: string;
  setCoinId: (id: string) => void;
  addCoin: (coin: Coin) => void;
  removeCoin: (id: string) => void;
  stress: StressInputs;
  setStress: (s: Partial<StressInputs>) => void;
  resetStress: () => void;
  verdict: Verdict;
  liveVerdict: Verdict;
}

const Ctx = createContext<StoreValue | null>(null);

const STORAGE_KEY = "stablesuite.customCoins";

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
  const [customCoins, setCustomCoins] = useState<Coin[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustomCoins(JSON.parse(raw) as Coin[]);
    } catch {
      /* ignore corrupted storage */
    }
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const coins = useMemo(() => [...COINS, ...customCoins], [customCoins]);

  function persist(next: Coin[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / privacy mode */
    }
  }

  function addCoin(c: Coin) {
    setCustomCoins((prev) => {
      const next = [...prev.filter((x) => x.id !== c.id), c];
      persist(next);
      return next;
    });
    setCoinId(c.id);
  }

  function removeCoin(id: string) {
    setCustomCoins((prev) => {
      const next = prev.filter((x) => x.id !== id);
      persist(next);
      return next;
    });
    setCoinId((cur) => (cur === id ? DEFAULT_COIN_ID : cur));
  }

  const coin = useMemo(
    () => coins.find((c) => c.id === coinId) ?? coins[0],
    [coins, coinId],
  );
  const liveCoin = useMemo(() => withLiveAttestationAge(coin, now), [coin, now]);

  const verdict = useMemo(() => computeVerdict(liveCoin, stress), [liveCoin, stress]);
  const liveVerdict = useMemo(
    () => computeVerdict(liveCoin, { run: 0, haircut: 0, fxShockBps: 0 }),
    [liveCoin],
  );

  const value: StoreValue = {
    coins,
    coin: liveCoin,
    coinId,
    setCoinId,
    addCoin,
    removeCoin,
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
