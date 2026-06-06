"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { ComplianceChecklist } from "@/components/dashboard/compliance-checklist";
import { Reveal } from "@/components/motion/primitives";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Every HKMA clause encoded as a deterministic, machine-checkable rule."
      />
      <Reveal>
        <ComplianceChecklist />
      </Reveal>
    </div>
  );
}
