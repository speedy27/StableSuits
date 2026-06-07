"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { StressLab } from "@/components/dashboard/stress-lab";
import { ReserveChart } from "@/components/dashboard/reserve-chart";
import { PegTracker } from "@/components/dashboard/peg-tracker";
import { Reveal } from "@/components/motion/primitives";

export default function StressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stress lab"
        description="Predictive solvency — the only signal that turns red before reserves do."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <StressLab />
        </Reveal>
        <Reveal delay={0.05}>
          <ReserveChart />
        </Reveal>
      </div>
      <Reveal delay={0.1}>
        <PegTracker />
      </Reveal>
    </div>
  );
}
