import { STATUS_LABELS, DECISION_LABELS, statusTone } from "@/lib/integra";
import { cn } from "@/lib/utils";

const toneClass = {
  success: "border-success/40 bg-success/15 text-success",
  destructive: "border-destructive/40 bg-destructive/15 text-destructive",
  warning: "border-warning/40 bg-warning/15 text-warning",
  muted: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  kind = "status",
  className,
}: {
  status: string;
  kind?: "status" | "decision";
  className?: string;
}) {
  const label =
    kind === "decision" ? (DECISION_LABELS[status] ?? status) : (STATUS_LABELS[status] ?? status);
  const tone =
    kind === "decision"
      ? status === "approved" || status === "approved_as_noted"
        ? "success"
        : status === "rejected"
          ? "destructive"
          : status === "revise_resubmit"
            ? "warning"
            : "muted"
      : statusTone(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-display text-[0.7rem] uppercase tracking-[0.12em]",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
