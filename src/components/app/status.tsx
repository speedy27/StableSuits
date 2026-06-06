import { cn } from "@/lib/utils";
import type { VerdictStatus } from "@/lib/types";

export const statusMeta: Record<
  VerdictStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  PASS: {
    label: "Compliant",
    text: "text-pass",
    bg: "bg-pass/10",
    border: "border-pass/25",
    dot: "bg-pass",
  },
  WARN: {
    label: "Under watch",
    text: "text-warn",
    bg: "bg-warn/10",
    border: "border-warn/25",
    dot: "bg-warn",
  },
  FAIL: {
    label: "In breach",
    text: "text-fail",
    bg: "bg-fail/10",
    border: "border-fail/25",
    dot: "bg-fail",
  },
};

export function StatusDot({
  status,
  pulse = false,
  className,
}: {
  status: VerdictStatus;
  pulse?: boolean;
  className?: string;
}) {
  const m = statusMeta[status];
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            m.dot,
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", m.dot)} />
    </span>
  );
}

export function StatusPill({
  status,
  label,
  className,
}: {
  status: VerdictStatus;
  label?: string;
  className?: string;
}) {
  const m = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
        m.bg,
        m.text,
        m.border,
        className,
      )}
    >
      <StatusDot status={status} pulse={status !== "PASS"} />
      {label ?? m.label}
    </span>
  );
}
