import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useFormFields, useFormRecord, useProjects } from "@/hooks/useIntegra";
import { Section, Field, PageHeader, PrioritySelect } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { SignaturePad } from "@/components/SignaturePad";
import { ApproverReview, requestApproval } from "@/components/ApprovalTrail";
import { notifyStatusChange } from "@/lib/notify.functions";
import { Attachments } from "@/components/Attachments";
import { Comments } from "@/components/Comments";
import { CustomFields, missingCustomField } from "@/components/CustomFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { generateFormId, today } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/substitutions/$id")({
  head: () => ({
    meta: [
      { title: "Equipment Substitution — Integra Procurement" },
      {
        name: "description",
        content: "Raise an equipment substitution or component transfer request with signatures.",
      },
      { property: "og:title", content: "Equipment Substitution — Integra Procurement" },
      { property: "og:description", content: "Substitution request with certification and review." },
    ],
  }),
  component: SubstitutionForm,
});

const selectClass =
  "h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

function SubstitutionForm() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: projects } = useProjects();
  const { data: recordRaw } = useFormRecord("equipment_substitutions", id);
  const { data: customFieldDefs } = useFormFields("equipment_substitutions");
  const record = recordRaw as any;

  const [form, setForm] = useState<any>({
    es_number: generateFormId("ES"),
    priority: "normal",
    project_id: "",
    specified_item: "",
    approver_id: "",
    custom_fields: {},
    from_equipment: "",
    from_location: "",
    on_equipment: "",
    on_location: "",
    reason: "",
    certified: false,
    requester_signature: null,
    requester_signed_at: today(),
    status: "draft",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) setForm(record);
  }, [record]);

  const set = (key: string, value: unknown) => setForm((prev: any) => ({ ...prev, [key]: value }));

  async function save(submit = false) {
    if (!user) return;
    if (!form.project_id) {
      toast.error("Select a project first.");
      return;
    }
    if (submit && (!form.certified || !form.requester_signature)) {
      toast.error("Certify and sign before submitting.");
      return;
    }
    if (submit && !form.approver_id) {
      toast.error("Select an approver before submitting.");
      return;
    }
    if (submit) {
      const missing = missingCustomField(customFieldDefs, form.custom_fields ?? {});
      if (missing) {
        toast.error(`${missing} is required.`);
        return;
      }
    }
    setSaving(true);
    const payload = {
      ...form,
      custom_fields: form.custom_fields ?? {},
      requester_signed_at: form.requester_signed_at || null,
      approver_id: form.approver_id || null,
      status: submit ? "submitted" : form.status,
      created_by: user.id,
    };
    delete (payload as any).projects;

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from("equipment_substitutions")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        if (submit) {
          await requestApproval("equipment_substitution", data.id, form.approver_id);
          notifyStatusChange({ data: { formType: "equipment_substitution", formId: data.id } }).catch(console.error);
        }
        toast.success(`${form.es_number} saved`);
        queryClient.invalidateQueries();
        navigate({ to: "/substitutions/$id", params: { id: data.id } });
      } else {
        const { error } = await supabase
          .from("equipment_substitutions")
          .update(payload as never)
          .eq("id", id);
        if (error) throw error;
        if (submit) {
          await requestApproval("equipment_substitution", id, form.approver_id);
          notifyStatusChange({ data: { formType: "equipment_substitution", formId: id } }).catch(console.error);
        }
        toast.success("Substitution updated");
        queryClient.invalidateQueries();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/substitutions">
          <ArrowLeft className="size-4" /> All substitutions
        </Link>
      </Button>

      <div className="mb-2 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="rounded-full border border-border px-3.5 py-1.5 text-xs text-foreground hover:border-primary">
          Download PDF / Print
        </button>
      </div>
      <PageHeader
        eyebrow="Equipment Substitution / Transfer Request"
        title={form.es_number}
        actions={
          <>
            <StatusBadge status={form.priority ?? "normal"} kind="priority" className="self-center" />
            <StatusBadge status={form.status} className="self-center" />
            <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button size="sm" disabled={saving} onClick={() => save(true)}>
              Submit for review
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <Section title="Request">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Priority">
              <PrioritySelect
                className={selectClass}
                value={form.priority}
                onChange={(value) => set("priority", value)}
              />
            </Field>
            <Field label="Project">
              <select
                className={selectClass}
                value={form.project_id ?? ""}
                onChange={(e) => set("project_id", e.target.value)}
              >
                <option value="">Select project</option>
                {(projects ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} — {project.number}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Specified item">
              <Input
                value={form.specified_item ?? ""}
                onChange={(e) => set("specified_item", e.target.value)}
                maxLength={160}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Component transfer"
          description="Move a component from one equipment tag onto another."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="FROM — equipment / tag">
              <Input
                value={form.from_equipment ?? ""}
                onChange={(e) => set("from_equipment", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="FROM — location">
              <Input
                value={form.from_location ?? ""}
                onChange={(e) => set("from_location", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="ON — equipment / tag">
              <Input
                value={form.on_equipment ?? ""}
                onChange={(e) => set("on_equipment", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="ON — location">
              <Input
                value={form.on_location ?? ""}
                onChange={(e) => set("on_location", e.target.value)}
                maxLength={120}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Reason for substitution">
              <Textarea
                rows={4}
                value={form.reason ?? ""}
                onChange={(e) => set("reason", e.target.value)}
                maxLength={1500}
              />
            </Field>
          </div>
        </Section>

        <Section title="Requester certification">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={Boolean(form.certified)}
              onCheckedChange={(checked) => set("certified", Boolean(checked))}
            />
            <span>
              I certify that the substitution above does not change the scope, performance or
              contract requirements unless noted.
            </span>
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SignaturePad
              label="Requester signature"
              value={form.requester_signature}
              onChange={(value) => set("requester_signature", value)}
            />
            <Field label="Date">
              <Input
                type="date"
                value={form.requester_signed_at ?? ""}
                onChange={(e) => set("requester_signed_at", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <ApproverReview
          formType="Equipment Substitution"
          formId={isNew ? null : id}
          approverId={form.approver_id}
          onApproverChange={(value) => set("approver_id", value)}
          canAssign={isNew || form.status === "draft" || form.status === "revise"}
          selectClass={selectClass}
        />

        {!isNew ? (
          <>
            <CustomFields
              formType="equipment_substitutions"
              values={form.custom_fields ?? {}}
              onChange={(next) => set("custom_fields", next)}
            />
            <Attachments formType="equipment_substitution" formId={id} />
            <Comments formType="equipment_substitution" formId={id} />
          </>
        ) : null}
      </div>
    </div>
  );
}
