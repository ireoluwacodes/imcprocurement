import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-display text-[0.68rem] uppercase tracking-[0.18em] text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-3xl text-center", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 text-balance text-3xl leading-[1.05] text-foreground md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base text-muted-foreground",
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
      {children ? (
        <div className={cn("mt-7 flex flex-wrap gap-3", align === "center" && "justify-center")}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function StepCard({
  step,
  title,
  description,
  className,
}: {
  step: number | string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <article className={cn("panel-raised p-6", className)}>
      <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-primary">
        Step {typeof step === "number" ? String(step).padStart(2, "0") : step}
      </span>
      <h3 className="mt-4 text-xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}

export function StatTile({
  figure,
  caption,
  className,
}: {
  figure: string;
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn("panel-raised p-6", className)}>
      <p className="stat-figure">{figure}</p>
      <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  tag,
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  tag?: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <article className={cn("panel-raised p-6", className)}>
      {Icon ? <Icon className="size-6 text-primary" /> : null}
      {tag ? <p className="mt-4 font-mono text-xs text-primary">{tag}</p> : null}
      <h3 className={cn("text-xl text-foreground", tag ? "mt-1" : "mt-4")}>{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}

export function CtaBand({
  eyebrow,
  title,
  description,
  footnote,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  footnote?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel-raised overflow-hidden px-6 py-14 text-center", className)}>
      <div className="signal-bar mx-auto mb-8 h-0.5 w-24" />
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 text-balance text-3xl leading-[1.05] text-foreground md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">{description}</p>
      ) : null}
      {children ? (
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      ) : null}
      {footnote ? <p className="mt-6 text-xs text-muted-foreground">{footnote}</p> : null}
    </div>
  );
}
