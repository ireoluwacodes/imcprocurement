import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog, useCurrentUser, useFormFields, useFormRecord, useForms, useProjects } from "@/hooks/useIntegra";
import { Section, Field, NumberInput, PageHeader, PrioritySelect } from "@/components/FormShell";
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
import { TRANSFER_TYPES, UOMS, emptyLine, generateFormId, today, type LineItem } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/transfers/$id")({
  head: () => ({
    meta: [
      { title: "Material Transfer — Integra Procurement" },
      {
        name: "description",
        content: "Log a material transfer with line items and dual transferred/received signatures.",
      },
      { property: "og:title", content: "Material Transfer — Integra Procurement" },
      { property: "og:description", content: "Material transfer form with dual signatures." },
    ],
  }),
  component: MaterialTransferForm,
});

const selectClass =
  "h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

function MaterialTransferForm() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: projects } = useProjects();
  const { data: purchaseRequests } = useForms("purchase_requests");
  const { data: recordRaw } = useFormRecord("material_transfers", id);
  const { data: customFieldDefs } = useFormFields("material_transfers");
  const { data: catalog } = useCatalog();
  const record = recordRaw as any;

  const [form, setForm] = useState<any>({
    mtf_number: generateFormId("MTF"),
    priority: "normal",
    project_id: "",
    transfer_date: today(),
    approver_id: "",
    custom_fields: {},
    transfer_type: "From Project",
    to_order_number: "",
    vendor_name: "",
    factory_po_number: "",
    remarks: "",
    transferred_by_name: "",
    transferred_by_signature: null,
    transferred_by_date: today(),
    transferred_by_contact: "",
    received_by_name: "",
    received_by_signature: null,
    received_by_date: "",
    received_by_contact: "",
    vehicle: "",
    driver: "",
    related_pr_id: "",
    status: "draft",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) return;
    setForm({
      ...record,
      related_pr_id: record.related_pr_id ?? "",
      received_by_date: record.received_by_date ?? "",
    });
    const stored = (record.line_items as LineItem[]) ?? [];
    setLines(stored.length ? stored : [emptyLine()]);
  }, [record]);

  const set = (key: string, value: unknown) => setForm((prev: any) => ({ ...prev, [key]: value }));
  const updateLine = (index: number, patch: Partial<LineItem>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  async function save(submit = false) {
    if (!user) return;
    if (!form.project_id) {
      toast.error("Select a project first.");
      return;
    }
    if (submit) {
      if (!form.transferred_by_name || !form.transferred_by_signature) {
        toast.error("Transferred by name and signature are required.");
        return;
      }
      if (!form.received_by_name || !form.received_by_signature) {
        toast.error("Received by name and signature are required.");
        return;
      }
      if (!form.approver_id) {
        toast.error("Select an approver before submitting.");
        return;
      }
      const missing = missingCustomField(customFieldDefs, form.custom_fields ?? {});
      if (missing) {
        toast.error(`${missing} is required.`);
        return;
      }
    }
    setSaving(true);
    const payload = {
      ...form,
      related_pr_id: form.related_pr_id || null,
      received_by_date: form.received_by_date || null,
      transferred_by_date: form.transferred_by_date || null,
      approver_id: form.approver_id || null,
      line_items: lines,
      custom_fields: form.custom_fields ?? {},
      status: submit ? "submitted" : form.status,
      created_by: user.id,
    };
    delete (payload as any).projects;

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from("material_transfers")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        if (submit) {
          await requestApproval("material_transfer", data.id, form.approver_id);
          notifyStatusChange({ data: { formType: "material_transfer", formId: data.id } }).catch(console.error);
        }
        toast.success(`${form.mtf_number} saved`);
        queryClient.invalidateQueries();
        navigate({ to: "/transfers/$id", params: { id: data.id } });
      } else {
        const { error } = await supabase
          .from("material_transfers")
          .update(payload as never)
          .eq("id", id);
        if (error) throw error;
        if (submit) {
          await requestApproval("material_transfer", id, form.approver_id);
          notifyStatusChange({ data: { formType: "material_transfer", formId: id } }).catch(console.error);
        }
        toast.success("Transfer updated");
        queryClient.invalidateQueries();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <datalist id="catalog-parts">
        {(catalog?.parts ?? []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="catalog-descriptions">
        {(catalog?.descriptions ?? []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="catalog-vendors">
        {(catalog?.vendors ?? []).map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/transfers">
          <ArrowLeft className="size-4" /> All transfers
        </Link>
      </Button>

      <div className="mb-2 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="rounded-full border border-border px-3.5 py-1.5 text-xs text-foreground hover:border-primary">
          Download PDF / Print
        </button>
      </div>
      <PageHeader
        eyebrow="Material Transfer Form"
        title={form.mtf_number}
        actions={
          <>
            <StatusBadge status={form.priority ?? "normal"} kind="priority" className="self-center" />
            <StatusBadge status={form.status} className="self-center" />
            <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button size="sm" disabled={saving} onClick={() => save(true)}>
              Submit transfer
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <Section title="Transfer details">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Priority">
              <PrioritySelect
                className={selectClass}
                value={form.priority}
                onChange={(value) => set("priority", value)}
              />
            </Field>
            <Field label="Date" hint="Set automatically when the transfer is created.">
              <Input type="date" value={form.transfer_date ?? today()} readOnly disabled />
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
            <Field label="Transfer type">
              <select
                className={selectClass}
                value={form.transfer_type ?? ""}
                onChange={(e) => set("transfer_type", e.target.value)}
              >
                {TRANSFER_TYPES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            {form.transfer_type === "To Order #" ? (
              <Field label="Order number">
                <Input
                  value={form.to_order_number ?? ""}
                  onChange={(e) => set("to_order_number", e.target.value)}
                  maxLength={60}
                />
              </Field>
            ) : null}
            {form.transfer_type === "Transfer Back to Vendor" ? (
              <Field label="Vendor">
                <Input
                  list="catalog-vendors"
                  value={form.vendor_name ?? ""}
                  onChange={(e) => set("vendor_name", e.target.value)}
                  maxLength={120}
                />
              </Field>
            ) : null}
            {form.transfer_type === "Return to Factory w/ PO#" ? (
              <Field label="Factory PO number">
                <Input
                  value={form.factory_po_number ?? ""}
                  onChange={(e) => set("factory_po_number", e.target.value)}
                  maxLength={60}
                />
              </Field>
            ) : null}
            <Field label="Linked purchase request" hint="Ties this transfer to its originating PR.">
              <select
                className={selectClass}
                value={form.related_pr_id ?? ""}
                onChange={(e) => set("related_pr_id", e.target.value)}
              >
                <option value="">None</option>
                {(purchaseRequests ?? []).map((pr: any) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.pr_number} — {pr.vendor ?? "no vendor"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Line items">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["No.", "Part number", "Description", "Qty", "Unit", "Remarks", ""].map((h) => (
                    <th key={h} className="rule-label px-2 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id} className="border-b border-border/50">
                    <td className="w-10 px-2 text-muted-foreground">{index + 1}</td>
                    <td className="p-1">
                      <Input
                        list="catalog-parts"
                        value={line.part}
                        onChange={(e) => updateLine(index, { part: e.target.value })}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        list="catalog-descriptions"
                        value={line.description}
                        onChange={(e) => updateLine(index, { description: e.target.value })}
                      />
                    </td>
                    <td className="w-20 p-1">
                      <NumberInput value={line.qty} onChange={(t) => updateLine(index, { qty: Number(t) })} />
                    </td>
                    <td className="w-24 p-1">
                      <select
                        className={selectClass}
                        value={line.uom}
                        onChange={(e) => updateLine(index, { uom: e.target.value })}
                      >
                        {UOMS.map((uom) => (
                          <option key={uom}>{uom}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <Input
                        value={line.remarks ?? ""}
                        onChange={(e) => updateLine(index, { remarks: e.target.value })}
                      />
                    </td>
                    <td className="w-10 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLines(lines.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines([...lines, emptyLine()])}
            >
              <Plus className="size-4" /> Add row
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLines([...lines, emptyLine(), emptyLine(), emptyLine()])}
            >
              Add 3 rows
            </Button>
          </div>
          <div className="mt-4">
            <Field label="Remarks">
              <Textarea
                rows={3}
                value={form.remarks ?? ""}
                onChange={(e) => set("remarks", e.target.value)}
                maxLength={1500}
              />
            </Field>
          </div>
        </Section>

        <Section title="Signatures" description="Both parties must sign to complete the transfer.">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Field label="Transferred by (name)">
                <Input
                  value={form.transferred_by_name ?? ""}
                  onChange={(e) => set("transferred_by_name", e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="Contact">
                <Input
                  value={form.transferred_by_contact ?? ""}
                  onChange={(e) => set("transferred_by_contact", e.target.value)}
                  maxLength={80}
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.transferred_by_date ?? ""}
                  onChange={(e) => set("transferred_by_date", e.target.value)}
                />
              </Field>
              <SignaturePad
                label="Transferred by signature"
                value={form.transferred_by_signature}
                onChange={(value) => set("transferred_by_signature", value)}
              />
            </div>
            <div className="space-y-4">
              <Field label="Received by (name)">
                <Input
                  value={form.received_by_name ?? ""}
                  onChange={(e) => set("received_by_name", e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="Contact">
                <Input
                  value={form.received_by_contact ?? ""}
                  onChange={(e) => set("received_by_contact", e.target.value)}
                  maxLength={80}
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.received_by_date ?? ""}
                  onChange={(e) => set("received_by_date", e.target.value)}
                />
              </Field>
              <SignaturePad
                label="Received by signature"
                value={form.received_by_signature}
                onChange={(value) => set("received_by_signature", value)}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Vehicle">
              <Input
                value={form.vehicle ?? ""}
                onChange={(e) => set("vehicle", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="Driver">
              <Input
                value={form.driver ?? ""}
                onChange={(e) => set("driver", e.target.value)}
                maxLength={80}
              />
            </Field>
          </div>
        </Section>

        <ApproverReview
          formType="Material Transfer"
          formId={isNew ? null : id}
          approverId={form.approver_id}
          onApproverChange={(value) => set("approver_id", value)}
          canAssign={isNew || form.status === "draft" || form.status === "revise"}
          selectClass={selectClass}
        />

        {!isNew ? (
          <>
            <CustomFields
              formType="material_transfers"
              values={form.custom_fields ?? {}}
              onChange={(next) => set("custom_fields", next)}
            />
            <Attachments formType="material_transfer" formId={id} />
            <Comments formType="material_transfer" formId={id} />
          </>
        ) : null}
      </div>
    </div>
  );
}
