import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/integra";
import { Input } from "@/components/ui/input";

export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)}>
      <div className="mb-4 border-b border-border pb-3">
        <h3 className="text-base text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="rule-label block">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="rule-label">{eyebrow}</p> : null}
        <h1 className="text-3xl text-foreground">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

// Number field typed as text: no spinner arrows or scroll-wheel changes, a cleared field stays
// empty instead of becoming 0 (which then read "01" after typing 1), and only digits and one
// decimal point get through. onChange receives the raw text.
export function NumberInput({
  value,
  onChange,
  ...props
}: { value: number | string; onChange: (text: string) => void } & Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
>) {
  const shown = (v: number | string) => (Number(v) ? String(v) : "");
  const [text, setText] = useState(shown(value));
  // Follow changes made elsewhere (record loaded, row removed) without fighting the typing.
  useEffect(() => {
    if (Number(text || 0) !== Number(value || 0)) setText(shown(value));
  }, [value, text]);
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const next = e.target.value.replace(",", ".");
        if (!/^\d*\.?\d*$/.test(next)) return;
        setText(next);
        onChange(next);
      }}
    />
  );
}

export function PrioritySelect({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (priority: string) => void;
  className: string;
}) {
  return (
    <select className={className} value={value ?? "normal"} onChange={(e) => onChange(e.target.value)}>
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          {PRIORITY_LABELS[priority]}
        </option>
      ))}
    </select>
  );
}
