import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  ...rest
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
} & Omit<ComponentProps<"section">, "title">) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
      {...rest}
    >
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            )}
            <div>
              <h3 className="text-sm font-medium tracking-tight">{title}</h3>
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={cn("flex-1 p-5", contentClassName)}>{children}</div>
    </section>
  );
}
