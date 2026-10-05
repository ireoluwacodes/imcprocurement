import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useActivity, useTeam } from "@/hooks/useIntegra";
import { PageHeader } from "@/components/FormShell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — Integra Procurement" },
      {
        name: "description",
        content: "Audit trail of every form, approval, comment and role change on the platform.",
      },
      { property: "og:title", content: "Activity Log — Integra Procurement" },
      { property: "og:description", content: "Who did what, and when, across every project." },
    ],
  }),
  component: ActivityPage,
});

const ENTITY_LABELS: Record<string, string> = {
  purchase_request: "Purchase Request",
  equipment_substitution: "Equipment Substitution",
  material_transfer: "Material Transfer",
  approval: "Approval",
  comment: "Comment",
  user_role: "Role",
  user: "User",
  project: "Project",
  inventory_item: "Inventory item",
  inventory_movement: "Stock change",
  connex: "Connex",
};

const ACTION_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  submitted: "submitted",
  in_review: "moved to review",
  approved: "approved",
  rejected: "rejected",
  revise: "sent back for revision",
  completed: "completed",
  decision: "recorded a decision on",
  commented: "commented on",
  role_added: "was given role",
  role_removed: "had role removed",
  user_invited: "invited",
  user_removed: "removed",
  user_deactivated: "deactivated",
  user_reactivated: "reactivated",
};

function ActivityPage() {
  const { data: entries, isLoading } = useActivity();
  const { data: team } = useTeam();
  const [query, setQuery] = useState("");

  function actorName(id: string | null) {
    if (!id) return "System";
    const member = (team ?? []).find((m) => m.id === id);
    if (!member) return "Unknown user";
    return `${member.first_name} ${member.last_name}`.trim() || member.email;
  }

  const subject = (entry: any) => {
    if (entry.entity_type === "user_role") {
      const target = actorName(entry.entity_id);
      return entry.actor_id && entry.actor_id !== entry.entity_id
        ? `${actorName(entry.actor_id)} ${entry.action === "role_removed" ? "removed role from" : "gave a role to"} ${target}`
        : `${target} ${ACTION_LABELS[entry.action] ?? entry.action}`;
    }
    return null;
  };

  const rows = (entries ?? []).filter((entry) =>
    `${actorName(entry.actor_id)} ${ENTITY_LABELS[entry.entity_type] ?? entry.entity_type} ${
      ACTION_LABELS[entry.action] ?? entry.action
    } ${entry.summary}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div>
      <PageHeader eyebrow="Compliance" title="Activity log" />

      <div className="panel">
        <div className="border-b border-border p-4">
          <Input
            placeholder="Search activity…"
            className="max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            rows.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-baseline gap-2 p-4 text-sm">
                {subject(entry) ? (
                  <span className="text-foreground">{subject(entry)}</span>
                ) : (
                  <>
                    <span className="text-foreground">{actorName(entry.actor_id)}</span>
                    <span className="text-muted-foreground">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                  </>
                )}
                <span className="font-display text-xs uppercase tracking-[0.12em] text-primary">
                  {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                </span>
                {entry.summary ? (
                  <span className="text-muted-foreground">— {entry.summary}</span>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
