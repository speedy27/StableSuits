"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { VerdictSummary } from "@/components/dashboard/verdict-summary";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { ReserveChart } from "@/components/dashboard/reserve-chart";
import { ComplianceChecklist } from "@/components/dashboard/compliance-checklist";
import { ProvenanceStrip } from "@/components/dashboard/provenance-strip";
import { Reveal } from "@/components/motion/primitives";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Can I trust this stablecoin right now — is it clean and is it solvent?"
      />
      <Reveal>
        <VerdictSummary />
      </Reveal>
      <KpiGrid />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Reveal>
          <ReserveChart />
        </Reveal>
        <Reveal delay={0.05}>
          <ComplianceChecklist compact />
        </Reveal>
      </div>
      <Reveal>
        <ProvenanceStrip />
      </Reveal>
    </div>
  );
}
