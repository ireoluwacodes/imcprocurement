import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApprovals } from "@/hooks/useIntegra";
import { APPROVAL_CHAIN, ROLE_LABELS, DECISION_LABELS, formatDate } from "@/lib/integra";
import { Section } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export async function createApprovalChain(formType: string, formId: string) {
  const rows = APPROVAL_CHAIN.map((step, index) => ({
    form_type: formType,
    form_id: formId,
    step_order: index + 1,
    role: step.role,
  }));
  const { error } = await supabase.from("approvals").insert(rows);
  if (error) throw error;
}

export function ApprovalTrail({
  formType,
  formId,
  table,
}: {
  formType: string;
  formId: string;
  table: "purchase_requests" | "equipment_substitutions" | "material_transfers";
}) {
  const { data: steps } = useApprovals(formId);
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});

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

    const remaining = (steps ?? []).filter((s) => s.id !== stepId && s.decision === "pending");
    const nextStatus =
      decision === "rejected"
        ? "rejected"
        : decision === "revise_resubmit"
          ? "revise"
          : remaining.length === 0
            ? "approved"
            : "in_review";
    await supabase
      .from(table)
      .update({ status: nextStatus as never })
      .eq("id", formId);

    toast.success(`Recorded: ${DECISION_LABELS[decision]}`);
    queryClient.invalidateQueries();
  }

  if (!steps || steps.length === 0) {
    return (
      <Section title="Approval routing" description="Submit the form to start the approval chain.">
        <ol className="space-y-2 text-sm text-muted-foreground">
          {APPROVAL_CHAIN.map((step, index) => (
            <li key={step.role}>
              {index + 1}. {step.label}
            </li>
          ))}
        </ol>
      </Section>
    );
  }

  return (
    <Section
      title="Approval routing"
      description="Superintendent → Executive → Project Manager → Trade Partners → Installation"
    >
      <ol className="space-y-4">
        {steps.map((step) => (
          <li key={step.id} className="rounded-sm border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-sm uppercase tracking-[0.1em] text-foreground">
                  {step.step_order}. {ROLE_LABELS[step.role] ?? step.role}
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
            {step.decision === "pending" ? (
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
