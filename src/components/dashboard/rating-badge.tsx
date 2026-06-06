import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/types";

const TONE: Record<Rating, string> = {
  AAA: "text-pass",
  AA: "text-pass",
  A: "text-foreground",
  BBB: "text-foreground",
  BB: "text-warn",
  B: "text-warn",
  CCC: "text-fail",
  D: "text-fail",
};

export function RatingBadge({
  rating,
  label = "Rating",
  className,
}: {
  rating: Rating;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-lg font-semibold tabular tracking-tight", TONE[rating])}>
        {rating}
      </span>
    </div>
  );
}
