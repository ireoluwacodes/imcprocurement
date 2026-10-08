import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApprovals, useCurrentUser, useMyRoles, useTeam } from "@/hooks/useIntegra";
import { ROLE_LABELS, DECISION_LABELS, formatDate } from "@/lib/integra";
import { Section } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export async function requestApproval(formType: string, formId: string, approverId: string) {
  const { error } = await supabase
    .from("approvals")
    .insert({ form_type: formType, form_id: formId, step_order: 1, assignee_id: approverId });
  if (error) throw error;
}

export function ApproverSelect({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (userId: string) => void;
  className: string;
}) {
  const { data: team } = useTeam();
  return (
    <select className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select approver</option>
      {(team ?? [])
        .filter((member) => member.is_active !== false)
        .map((member) => (
          <option key={member.id} value={member.id}>
            {`${member.first_name} ${member.last_name}`.trim() || member.email}
          </option>
        ))}
    </select>
  );
}

export function ApprovalTrail({ formType, formId }: { formType: string; formId: string }) {
  const { data: steps } = useApprovals(formId);
  const { data: user } = useCurrentUser();
  const { data: myRoles } = useMyRoles();
  const { data: team } = useTeam();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});

  const nameOf = (userId: string) => {
    const person = team?.find((member) => member.id === userId);
    return person ? `${person.first_name} ${person.last_name}`.trim() || person.email : "Assigned approver";
  };
  // Mirrors the approvals_update policy: the assignee, an admin, or (older steps) the role holder.
  const canDecide = (step: { assignee_id: string | null; role: string | null }) =>
    Boolean(myRoles?.includes("admin")) ||
    (step.assignee_id ? step.assignee_id === user?.id : Boolean(step.role && myRoles?.includes(step.role)));

  async function decide(stepId: string, decision: string) {
    const { error } = await supabase
      .from("approvals")
      .update({
        decision: decision as never,
        comments: comments[stepId] ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", stepId);
    if (error) {
      toast.error(error.message);
      return;
    }

    // The database moves the form's status to match the decision.
    toast.success(`Recorded: ${DECISION_LABELS[decision]}`);
    queryClient.invalidateQueries();
  }

  if (!steps || steps.length === 0) {
    return (
      <Section title="Approval">
        <p className="text-sm text-muted-foreground">Submit the form to send it to the selected approver.</p>
      </Section>
    );
  }

  return (
    <Section
      title="Approval"
      description="The assigned approver records the decision."
    >
      <ol className="space-y-4">
        {steps.map((step) => (
          <li key={step.id} className="rounded-sm border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-sm uppercase tracking-[0.1em] text-foreground">
                  {step.assignee_id ? nameOf(step.assignee_id) : (ROLE_LABELS[step.role ?? ""] ?? step.role)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.decided_at ? `Decided ${formatDate(step.decided_at)}` : "Awaiting decision"}
                </p>
              </div>
              <StatusBadge status={step.decision} kind="decision" />
            </div>
            {step.comments ? (
              <p className="mt-2 text-sm text-muted-foreground">“{step.comments}”</p>
            ) : null}
            {step.decision === "pending" && canDecide(step) ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Comments (optional)"
                  value={comments[step.id] ?? ""}
                  onChange={(e) => setComments({ ...comments, [step.id]: e.target.value })}
                  maxLength={1000}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(step.id, "approved")}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(step.id, "approved_as_noted")}
                  >
                    Approve as noted
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(step.id, "revise_resubmit")}
                  >
                    Revise &amp; resubmit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => decide(step.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        {formType} · Every decision is timestamped and retained for audit.
      </p>
    </Section>
  );
}
