import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-secondary">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M8 15.5c1 1 2.4 1.6 4 1.6 2.2 0 3.6-1 3.6-2.6 0-1.5-1-2.2-3.3-2.7-1.9-.4-2.6-.8-2.6-1.5 0-.7.7-1.2 1.9-1.2 1.1 0 2 .4 2.7 1.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWord && (
        <div className="leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            StableSuite
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Compliance · live
          </span>
        </div>
      )}
    </div>
  );
}
