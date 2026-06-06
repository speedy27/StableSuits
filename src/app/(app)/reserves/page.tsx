"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { ReserveChart } from "@/components/dashboard/reserve-chart";
import { ReserveComposition } from "@/components/dashboard/reserve-composition";
import { RedemptionChart } from "@/components/dashboard/redemption-chart";
import { Reveal } from "@/components/motion/primitives";

export default function ReservesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reserves"
        description="Backing, composition and redemption health under the HKMA reserve rules."
      />
      <Reveal>
        <ReserveChart />
      </Reveal>
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <ReserveComposition />
        </Reveal>
        <Reveal delay={0.05}>
          <RedemptionChart />
        </Reveal>
      </div>
    </div>
  );
}
