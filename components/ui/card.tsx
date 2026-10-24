import { cn } from "@/lib/utils";

/** کارت شیشه‌ای — پایه‌ی بیشتر سطوح محتوا در سایت. */
export function Card({
  className,
  glass = true,
  ...props
}: React.ComponentProps<"div"> & { glass?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl2",
        glass ? "glass" : "border border-white/8 bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5 pb-0", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>
        {description ? (
          <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-white/6 px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}