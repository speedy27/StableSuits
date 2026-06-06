"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const label = now
    ? now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Hong_Kong",
      })
    : "--:--:--";

  return (
    <span className="tabular text-xs font-medium text-muted-foreground">
      {label}{" "}
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
        HKT
      </span>
    </span>
  );
}
