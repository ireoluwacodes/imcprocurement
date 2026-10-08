import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApprovals, useCurrentUser, useForms, useMyRoles, useTeam } from "@/hooks/useIntegra";
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

const ALL_DECISIONS = ["pending", "approved", "approved_as_noted", "revise_resubmit", "rejected"];
const FILTERS = {
  all: { label: "All", decisions: ALL_DECISIONS },
  mine: { label: "Waiting on me", decisions: [] as string[] },
  pending: { label: "Pending", decisions: ["pending"] },
  approved: { label: "Approved", decisions: ["approved", "approved_as_noted"] },
  declined: { label: "Declined", decisions: ["rejected"] },
};

function ApprovalsPage() {
  const { data: steps, isLoading } = useApprovals();
  const { data: prs } = useForms("purchase_requests");
  const { data: subs } = useForms("equipment_substitutions");
  const { data: mtfs } = useForms("material_transfers");
  const { data: team } = useTeam();
  const { data: user } = useCurrentUser();
  const { data: myRoles } = useMyRoles();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<keyof typeof FILTERS>("all");

  const numbers = useMemo(() => {
    const map = new Map<string, string>();
    (prs ?? []).forEach((r: any) => map.set(r.id, r.pr_number));
    (subs ?? []).forEach((r: any) => map.set(r.id, r.es_number));
    (mtfs ?? []).forEach((r: any) => map.set(r.id, r.mtf_number));
    return map;
  }, [prs, subs, mtfs]);
  const priorities = useMemo(() => {
    const map = new Map<string, string>();
    [...(prs ?? []), ...(subs ?? []), ...(mtfs ?? [])].forEach((r: any) => map.set(r.id, r.priority));
    return map;
  }, [prs, subs, mtfs]);

  const approverOf = (step: { assignee_id: string | null; role: string | null }) => {
    const member = step.assignee_id ? team?.find((m) => m.id === step.assignee_id) : undefined;
    if (member) return `${member.first_name} ${member.last_name}`.trim() || member.email;
    return ROLE_LABELS[step.role ?? ""] ?? step.role ?? "—";
  };

  // Pending steps assigned to me, or (older role-based steps) routed to a role I hold.
  const waitingOnMe = (step: { decision: string; assignee_id: string | null; role: string | null }) =>
    step.decision === "pending" &&
    (step.assignee_id ? step.assignee_id === user?.id : Boolean(step.role && myRoles?.includes(step.role)));

  const formSteps = (steps ?? []).filter((step) => step.form_type !== "purchase_request");
  const mineCount = formSteps.filter(waitingOnMe).length;
  const rows = formSteps
    .filter((step) => (filter === "mine" ? waitingOnMe(step) : FILTERS[filter].decisions.includes(step.decision)))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((step) => {
      const haystack = `${numbers.get(step.form_id) ?? ""} ${TYPE_LABELS[step.form_type] ?? ""} ${approverOf(
        step,
      )}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

  return (
    <div>
      <PageHeader
        eyebrow="Workflow"
        title="Approvals"
        actions={
          <div className="flex gap-2">
            {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((value) => (
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
                {value === "mine" ? `${FILTERS.mine.label} (${mineCount})` : FILTERS[value].label}
              </button>
            ))}
          </div>
        }
      />

      <div className="panel">
        <div className="border-b border-border p-4">
          <Input
            placeholder="Search by form number or approver…"
            className="max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Form", "Priority", "Type", "Approver", "Decision"].map((header) => (
                  <th key={header} className="rule-label px-4 py-3 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted-foreground">
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
                    <td className="px-4 py-3">
                      <StatusBadge status={priorities.get(step.form_id) ?? "normal"} kind="priority" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[step.form_type] ?? step.form_type}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{approverOf(step)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={step.decision} kind="decision" />
                        <span className="text-xs text-muted-foreground">
                          {step.decision === "pending"
                            ? `waiting on ${approverOf(step)}`
                            : step.decided_at
                              ? formatDate(step.decided_at)
                              : ""}
                        </span>
                      </div>
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
