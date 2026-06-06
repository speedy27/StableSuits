"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { AmlPanel } from "@/components/dashboard/aml-panel";
import { RedemptionChart } from "@/components/dashboard/redemption-chart";
import { Reveal } from "@/components/motion/primitives";

export default function AmlPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AML signals"
        description="Continuous transaction monitoring — clean is the entry question for every VATP."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <AmlPanel />
        </Reveal>
        <Reveal delay={0.05}>
          <RedemptionChart />
        </Reveal>
      </div>
    </div>
  );
}
