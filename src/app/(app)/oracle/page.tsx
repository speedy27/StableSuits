"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { OracleFeed } from "@/components/dashboard/oracle-feed";
import { ProvenanceStrip } from "@/components/dashboard/provenance-strip";
import { Reveal } from "@/components/motion/primitives";

export default function OraclePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Oracle & audit"
        description="The signed verdict humans read and smart contracts enforce — with a live audit trail."
      />
      <Reveal>
        <OracleFeed />
      </Reveal>
      <Reveal delay={0.05}>
        <ProvenanceStrip />
      </Reveal>
    </div>
  );
}
