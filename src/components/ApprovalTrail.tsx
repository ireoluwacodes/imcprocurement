import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApprovals, useCurrentUser, useMyRoles, useTeam } from "@/hooks/useIntegra";
import { ROLE_LABELS, DECISION_LABELS, formatDate } from "@/lib/integra";
import { Field, Section } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notifyStatusChange } from "@/lib/notify.functions";

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

// The form's approver review: who approves it, and their decision. Only the assigned approver
// sees the decision controls (the approvals_update policy enforces the same).
export function ApproverReview({
  formType,
  formId,
  approverId,
  onApproverChange,
  canAssign,
  selectClass,
}: {
  formType: string;
  formId: string | null;
  approverId: string | null;
  onApproverChange: (userId: string) => void;
  canAssign: boolean;
  selectClass: string;
}) {
  const { data: steps } = useApprovals(formId);
  const { data: user } = useCurrentUser();
  const { data: myRoles } = useMyRoles();
  const { data: team } = useTeam();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});

  const nameOf = (userId: string) => {
    const person = team?.find((member) => member.id === userId);
    return person ? `${person.first_name} ${person.last_name}`.trim() || person.email : "the approver";
  };
  const approverOf = (step: { assignee_id: string | null; role: string | null }) =>
    step.assignee_id ? nameOf(step.assignee_id) : (ROLE_LABELS[step.role ?? ""] ?? step.role ?? "the approver");
  // Assigned steps: only the assignee. Older role-routed steps: the role holder or an admin.
  const canDecide = (step: { assignee_id: string | null; role: string | null }) =>
    step.assignee_id
      ? step.assignee_id === user?.id
      : Boolean(myRoles?.includes("admin") || (step.role && myRoles?.includes(step.role)));

  async function decide(stepId: string, decision: string) {
    const { data: updated, error } = await supabase
      .from("approvals")
      .update({
        decision: decision as never,
        comments: comments[stepId] ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", stepId)
      .select("form_type");
    if (error || !updated?.length) {
      toast.error(error?.message ?? "Only the assigned approver can record this decision.");
      return;
    }

    // The database moves the form's status to match the decision; then email creator and approver.
    if (formId) notifyStatusChange({ data: { formType: updated[0]!.form_type, formId } }).catch(console.error);
    toast.success(`Recorded: ${DECISION_LABELS[decision]}`);
    queryClient.invalidateQueries();
  }

  const history = formId ? (steps ?? []) : [];

  return (
    <Section title="Approver review">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Approver" {...(canAssign ? { hint: "They are asked to approve when you submit." } : {})}>
          {canAssign ? (
            <ApproverSelect className={selectClass} value={approverId} onChange={onApproverChange} />
          ) : (
            <p className="flex h-9 items-center text-sm text-foreground">
              {approverId ? nameOf(approverId) : "—"}
            </p>
          )}
        </Field>
      </div>

      <div className="mt-5 space-y-3">
        <span className="rule-label block">Decision (Project Executive)</span>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Submit the form to send it to the approver.</p>
        ) : null}
        {history.map((step) => (
          <div key={step.id} className="rounded-sm border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-foreground">
                {step.decision === "pending"
                  ? `Pending — waiting on ${approverOf(step)}`
                  : `${approverOf(step)} · ${step.decided_at ? formatDate(step.decided_at) : ""}`}
              </p>
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
                  <Button size="sm" variant="outline" onClick={() => decide(step.id, "approved_as_noted")}>
                    Approve as noted
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(step.id, "revise_resubmit")}>
                    Revise &amp; resubmit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(step.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {formType} · Every decision is timestamped and retained for audit.
      </p>
    </Section>
  );
}
