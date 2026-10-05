import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApprovals, useForms } from "@/hooks/useIntegra";
import { PageHeader } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS, formatDate } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals Queue — Integra Procurement" },
      {
        name: "description",
        content: "Track every pending and completed approval step across purchase and transfer forms.",
      },
      { property: "og:title", content: "Approvals Queue — Integra Procurement" },
      { property: "og:description", content: "Pending and completed approval steps." },
    ],
  }),
  component: ApprovalsPage,
});

const LINKS = {
  purchase_request: "/purchase-requests/$id",
  equipment_substitution: "/substitutions/$id",
  material_transfer: "/transfers/$id",
} as const;

const TYPE_LABELS: Record<string, string> = {
  purchase_request: "Purchase Request",
  equipment_substitution: "Substitution",
  material_transfer: "Material Transfer",
};

function ApprovalsPage() {
  const { data: steps, isLoading } = useApprovals();
  const { data: prs } = useForms("purchase_requests");
  const { data: subs } = useForms("equipment_substitutions");
  const { data: mtfs } = useForms("material_transfers");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"pending" | "decided" | "all">("all");

  const numbers = useMemo(() => {
    const map = new Map<string, string>();
    (prs ?? []).forEach((r: any) => map.set(r.id, r.pr_number));
    (subs ?? []).forEach((r: any) => map.set(r.id, r.es_number));
    (mtfs ?? []).forEach((r: any) => map.set(r.id, r.mtf_number));
    return map;
  }, [prs, subs, mtfs]);

  const rows = (steps ?? [])
    .filter((step) => step.form_type !== "purchase_request")
    .filter((step) =>
      filter === "pending"
        ? step.decision === "pending"
        : filter === "decided"
          ? step.decision !== "pending"
          : true,
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((step) => {
      const haystack = `${numbers.get(step.form_id) ?? ""} ${TYPE_LABELS[step.form_type] ?? ""} ${
        ROLE_LABELS[step.role] ?? ""
      }`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

  return (
    <div>
      <PageHeader
        eyebrow="Workflow"
        title="Approvals"
        actions={
          <div className="flex gap-2">
            {(["all", "pending", "decided"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-sm border px-3 py-1.5 font-display text-xs uppercase tracking-[0.12em] ${
                  filter === value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {value === "pending" ? "Pending" : value === "decided" ? "Decided" : "All"}
              </button>
            ))}
          </div>
        }
      />

      <div className="panel">
        <div className="border-b border-border p-4">
          <Input
            placeholder="Search by form number or role…"
            className="max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Form", "Type", "Step", "Assigned role", "Decision", "Decided"].map((header) => (
                  <th key={header} className="rule-label px-4 py-3 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    Nothing to show.
                  </td>
                </tr>
              ) : (
                rows.map((step) => (
                  <tr key={step.id} className="border-b border-border/60 hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <Link
                        to={LINKS[step.form_type as keyof typeof LINKS] ?? "/dashboard"}
                        params={{ id: step.form_id }}
                        className="font-mono text-primary hover:underline"
                      >
                        {numbers.get(step.form_id) ?? "Open"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[step.form_type] ?? step.form_type}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{step.step_order}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ROLE_LABELS[step.role] ?? step.role}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={step.decision} kind="decision" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {step.decided_at ? formatDate(step.decided_at) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
