import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCatalog,
  useCurrentUser,
  useFormFields,
  useFormRecord,
  useMyRoles,
  useProjects,
  useTeam,
} from "@/hooks/useIntegra";
import { Section, Field, PageHeader } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Attachments } from "@/components/Attachments";
import { Comments } from "@/components/Comments";
import { CustomFields, missingCustomField } from "@/components/CustomFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MODULES,
  PR_REASONS,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
  SHIP_METHODS,
  SHIP_VIA,
  UOMS,
  emptyLine,
  generateFormId,
  lineTotal,
  money,
  sumLines,
  today,
  type LineItem,
} from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/purchase-requests/$id")({
  head: () => ({
    meta: [
      { title: "Purchase Request — Integra Procurement" },
      {
        name: "description",
        content: "Create and route a purchase request with vendor, shipping and line item detail.",
      },
      { property: "og:title", content: "Purchase Request — Integra Procurement" },
      { property: "og:description", content: "Create and route a purchase request." },
    ],
  }),
  component: PurchaseRequestForm,
});

const selectClass =
  "h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

function PurchaseRequestForm() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: projects } = useProjects();
  const { data: team } = useTeam();
  const { data: myRoles } = useMyRoles();
  const canSetPurchaseStatus = Boolean(myRoles?.some((role) => role === "admin" || role === "procurement"));
  const { data: recordRaw } = useFormRecord("purchase_requests", id);
  const { data: customFieldDefs } = useFormFields("purchase_requests");
  const { data: catalog } = useCatalog();
  const record = recordRaw as any;

  const [form, setForm] = useState<any>({
    pr_number: generateFormId("PR"),
    request_date: today(),
    required_date: "",
    project_id: "",
    vendor: "",
    custom_fields: {},
    requester_name: "",
    requester_phone: "",
    vendor_contact_name: "",
    vendor_contact_phone: "",
    vendor_contact_email: "",
    approver_id: "",
    ship_to: "",
    ship_method: "Ground",
    ship_via: "Will Call",
    work_order: "",
    module: "",
    costpoint_code: "",
    reasons: [] as string[],
    reason_other: "",
    notes: "",
    po_date: "",
    po_number: "",
    buyer: "",
    status: "draft",
    purchase_status: "not_ordered",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) return;
    setForm({ ...record, required_date: record.required_date ?? "" });
    const stored = (record.line_items as LineItem[]) ?? [];
    setLines(stored.length ? stored : [emptyLine()]);
  }, [record]);

  const total = sumLines(lines);
  const set = (key: string, value: unknown) => setForm((prev: any) => ({ ...prev, [key]: value }));

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function save(submit = false) {
    if (!user) return;
    if (!form.project_id) {
      toast.error("Select a project before saving.");
      return;
    }
    if (form.reasons.includes("Other") && !form.reason_other.trim()) {
      toast.error("Explain the 'Other' reason.");
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
      required_date: form.required_date || null,
      po_date: form.po_date || null,
      approver_id: form.approver_id || null,
      line_items: lines,
      custom_fields: form.custom_fields ?? {},
      total,
      status: submit ? "submitted" : form.status,
      created_by: user.id,
    };
    delete (payload as any).projects;

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from("purchase_requests")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        toast.success(`${form.pr_number} saved`);
        queryClient.invalidateQueries();
        navigate({ to: "/purchase-requests/$id", params: { id: data.id } });
      } else {
        const { error } = await supabase
          .from("purchase_requests")
          .update(payload as never)
          .eq("id", id);
        if (error) throw error;
        toast.success("Purchase request updated");
        queryClient.invalidateQueries();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequest() {
    if (!record) return;
    if (!window.confirm(`Delete ${form.pr_number}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const { data: files } = await supabase
        .from("attachments")
        .select("file_path")
        .eq("form_type", "purchase_requests")
        .eq("form_id", record.id);
      const paths = ((files ?? []) as { file_path: string | null }[])
        .map((f) => f.file_path)
        .filter((p): p is string => Boolean(p));
      if (paths.length) {
        await supabase.storage.from("form-attachments").remove(paths);
      }
      await supabase.from("comments").delete().eq("form_type", "purchase_requests").eq("form_id", record.id);
      await supabase.from("attachments").delete().eq("form_type", "purchase_requests").eq("form_id", record.id);
      const { error } = await supabase.from("purchase_requests").delete().eq("id", record.id);
      if (error) throw error;
      toast.success("Purchase request deleted");
      queryClient.invalidateQueries();
      navigate({ to: "/purchase-requests" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <datalist id="catalog-parts">
        {(catalog?.parts ?? []).map((item: string) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="catalog-descriptions">
        {(catalog?.descriptions ?? []).map((item: string) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="catalog-vendors">
        {(catalog?.vendors ?? []).map((item: string) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/purchase-requests">
          <ArrowLeft className="size-4" /> All purchase requests
        </Link>
      </Button>

      <div className="mb-2 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="rounded-full border border-border px-3.5 py-1.5 text-xs text-foreground hover:border-primary">
          Download PDF / Print
        </button>
      </div>
      <PageHeader
        eyebrow="Purchase Request"
        title={form.pr_number}
        actions={
          <>
            <StatusBadge status={form.status} className="self-center" />
            {isNew || form.status === "draft" || form.status === "revise" ? (
              <>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>
                  Save draft
                </Button>
                <Button size="sm" disabled={saving} onClick={() => save(true)}>
                  Submit request
                </Button>
              </>
            ) : (
              <span className="self-center text-xs text-muted-foreground">
                Submitted — kept for reference
              </span>
            )}
            {!isNew && form.status !== "draft" && form.status !== "revise" ? (
              <select
                className={`${selectClass} w-auto self-center`}
                value={form.purchase_status ?? "not_ordered"}
                disabled={saving || !canSetPurchaseStatus}
                title={canSetPurchaseStatus ? undefined : "Only Procurement or an administrator can change this."}
                onChange={async (e) => {
                  const previous = form.purchase_status;
                  const next = e.target.value;
                  set("purchase_status", next);
                  setSaving(true);
                  // RLS drops an unpermitted update without an error, so check a row came back.
                  const { data: updated, error } = await supabase
                    .from("purchase_requests")
                    .update({ purchase_status: next } as never)
                    .eq("id", id)
                    .select("id");
                  setSaving(false);
                  if (error || !updated?.length) {
                    set("purchase_status", previous);
                    toast.error(error?.message ?? "Only Procurement or an administrator can change the purchase status.");
                  } else {
                    toast.success(`Marked as ${PURCHASE_STATUS_LABELS[next] ?? next}`);
                    queryClient.invalidateQueries();
                  }
                }}
              >
                {PURCHASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PURCHASE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            ) : null}
            {!isNew && record ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-destructive hover:text-destructive"
                disabled={saving}
                onClick={deleteRequest}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4">
        <Section title="Request details">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Request date">
              <Input
                type="date"
                value={form.request_date ?? ""}
                onChange={(e) => set("request_date", e.target.value)}
              />
            </Field>
            <Field label="Date required">
              <Input
                type="date"
                value={form.required_date ?? ""}
                onChange={(e) => set("required_date", e.target.value)}
              />
            </Field>
            <Field label="Vendor">
              <Input
                list="catalog-vendors"
                value={form.vendor ?? ""}
                onChange={(e) => set("vendor", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Requested by">
              <Input
                value={form.requester_name ?? ""}
                onChange={(e) => set("requester_name", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Requester phone">
              <Input
                value={form.requester_phone ?? ""}
                onChange={(e) => set("requester_phone", e.target.value)}
                maxLength={30}
              />
            </Field>
            <Field label="Approver">
              <select
                className={selectClass}
                value={form.approver_id ?? ""}
                onChange={(e) => set("approver_id", e.target.value)}
              >
                <option value="">Select approver</option>
                {(team ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {`${member.first_name} ${member.last_name}`.trim() || member.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vendor contact">
              <Input
                value={form.vendor_contact_name ?? ""}
                onChange={(e) => set("vendor_contact_name", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Vendor phone">
              <Input
                value={form.vendor_contact_phone ?? ""}
                onChange={(e) => set("vendor_contact_phone", e.target.value)}
                maxLength={30}
              />
            </Field>
            <Field label="Vendor email">
              <Input
                type="email"
                value={form.vendor_contact_email ?? ""}
                onChange={(e) => set("vendor_contact_email", e.target.value)}
                maxLength={255}
              />
            </Field>
          </div>
        </Section>

        <Section title="Shipping">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Ship to (address)" className="md:col-span-1">
              <Input
                value={form.ship_to ?? ""}
                onChange={(e) => set("ship_to", e.target.value)}
                maxLength={200}
              />
            </Field>
            <Field label="Method">
              <select
                className={selectClass}
                value={form.ship_method ?? ""}
                onChange={(e) => set("ship_method", e.target.value)}
              >
                {SHIP_METHODS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Ship via">
              <select
                className={selectClass}
                value={form.ship_via ?? ""}
                onChange={(e) => set("ship_via", e.target.value)}
              >
                {SHIP_VIA.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Project">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project">
              <select
                className={selectClass}
                value={form.project_id ?? ""}
                onChange={(e) => {
                  const project = (projects ?? []).find((p) => p.id === e.target.value);
                  set("project_id", e.target.value);
                  if (project?.costpoint_code) set("costpoint_code", project.costpoint_code);
                }}
              >
                <option value="">Select project</option>
                {(projects ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} — {project.number}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work order / CxAlloy issue">
              <Input
                value={form.work_order ?? ""}
                onChange={(e) => set("work_order", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="Module (PDC, Gen, Chiller, etc)">
              <Input
                list="module-options"
                placeholder="e.g. PDC B-1-8"
                value={form.module ?? ""}
                onChange={(e) => set("module", e.target.value)}
                maxLength={80}
              />
              <datalist id="module-options">
                {MODULES.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <Field label="Cost code">
              <Input
                value={form.costpoint_code ?? ""}
                onChange={(e) => set("costpoint_code", e.target.value)}
                maxLength={40}
              />
            </Field>
          </div>
        </Section>

        <Section title="Reason for request">
          <div className="grid gap-3 sm:grid-cols-3">
            {PR_REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.reasons?.includes(reason)}
                  onCheckedChange={(checked) =>
                    set(
                      "reasons",
                      checked
                        ? [...(form.reasons ?? []), reason]
                        : (form.reasons ?? []).filter((r: string) => r !== reason),
                    )
                  }
                />
                {reason}
              </label>
            ))}
          </div>
          {form.reasons?.includes("Other") ? (
            <div className="mt-4">
              <Field label="Explanation">
                <Textarea
                  value={form.reason_other ?? ""}
                  onChange={(e) => set("reason_other", e.target.value)}
                  maxLength={500}
                />
              </Field>
            </div>
          ) : null}
        </Section>

        <Section title="Line items" description="Totals calculate automatically.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Item / Part", "Description", "Qty", "UOM", "Price EA", "Total", ""].map(
                    (header) => (
                      <th key={header} className="rule-label px-2 py-2 text-left">
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id} className="border-b border-border/50">
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
                      <Input
                        type="number"
                        min={0}
                        value={line.qty}
                        onChange={(e) => updateLine(index, { qty: Number(e.target.value) })}
                      />
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
                    <td className="w-28 p-1">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.price}
                        onChange={(e) => updateLine(index, { price: Number(e.target.value) })}
                      />
                    </td>
                    <td className="w-28 p-1 font-mono text-muted-foreground">
                      {money(lineTotal(line))}
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
          <div className="mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines([...lines, emptyLine()])}
            >
              <Plus className="size-4" /> Add row
            </Button>
            <p className="font-display text-2xl text-foreground">{money(total)}</p>
          </div>
          <div className="mt-4">
            <Field label="Notes">
              <Textarea
                rows={4}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                maxLength={2000}
              />
            </Field>
          </div>
        </Section>

        <Section title="Purchasing" description="Completed by the purchasing department.">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="PO date">
              <Input
                type="date"
                value={form.po_date ?? ""}
                onChange={(e) => set("po_date", e.target.value)}
              />
            </Field>
            <Field label="PO number">
              <Input
                value={form.po_number ?? ""}
                onChange={(e) => set("po_number", e.target.value)}
                maxLength={40}
              />
            </Field>
            <Field label="Buyer">
              <Input
                value={form.buyer ?? ""}
                onChange={(e) => set("buyer", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="PR number">
              <Input value={form.pr_number} readOnly className="font-mono" />
            </Field>
          </div>
        </Section>

        {!isNew ? (
          <>
            <CustomFields
              formType="purchase_requests"
              values={form.custom_fields ?? {}}
              onChange={(next) => set("custom_fields", next)}
            />
            <Attachments formType="purchase_request" formId={id} />
            <Comments formType="purchase_request" formId={id} />
          </>
        ) : null}
      </div>
    </div>
  );
}
