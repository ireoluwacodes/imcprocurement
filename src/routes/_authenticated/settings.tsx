import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Field } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormFields, useIsAdmin } from "@/hooks/useIntegra";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Form Setup — Integra Procurement" },
      {
        name: "description",
        content: "Add custom fields to the purchase, substitution and transfer forms.",
      },
      { property: "og:title", content: "Form Setup — Integra Procurement" },
      { property: "og:description", content: "Custom field builder with versioning." },
    ],
  }),
  component: SettingsPage,
});

const FORMS = [
  { value: "purchase_requests", label: "Purchase Request" },
  { value: "equipment_substitutions", label: "Equipment Substitution" },
  { value: "material_transfers", label: "Material Transfer" },
] as const;

const TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Long text" },
] as const;

const selectClass =
  "h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

function slugify(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "field"
  );
}

function SettingsPage() {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const { data: fields, isLoading } = useFormFields();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    form_type: FORMS[0].value as string,
    label: "",
    field_type: "text",
    options: "",
    required: false,
  });

  const version = (fields ?? []).reduce((max, field) => Math.max(max, field.version), 1);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["form-fields"] });
  }

  async function addField() {
    if (!draft.label.trim()) {
      toast.error("Give the field a label.");
      return;
    }
    setSaving(true);
    const base = slugify(draft.label);
    const taken = new Set((fields ?? []).map((f) => `${f.form_type}:${f.field_key}`));
    let key = base;
    let suffix = 2;
    while (taken.has(`${draft.form_type}:${key}`)) key = `${base}_${suffix++}`;

    const { error } = await supabase.from("form_fields").insert({
      form_type: draft.form_type,
      field_key: key,
      label: draft.label.trim(),
      field_type: draft.field_type,
      options:
        draft.field_type === "select"
          ? draft.options
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean)
          : [],
      required: draft.required,
      sort_order: (fields ?? []).filter((f) => f.form_type === draft.form_type).length,
      version: version + 1,
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Only administrators can change form setup."
          : error.message,
      );
      return;
    }
    setDraft({ form_type: draft.form_type, label: "", field_type: "text", options: "", required: false });
    toast.success("Field added — it now appears on the form");
    refresh();
  }

  async function toggleActive(id: string, is_active: boolean) {
    const { error } = await supabase
      .from("form_fields")
      .update({ is_active, version: version + 1 })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  async function removeField(id: string) {
    const { error } = await supabase.from("form_fields").delete().eq("id", id);
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Only administrators can change form setup."
          : error.message,
      );
      return;
    }
    toast.success("Field removed");
    refresh();
  }

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Form setup" />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Section
          title="Custom fields"
          description={`Layout version ${version}. Fields appear on the live forms for everyone.`}
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (fields ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom fields yet — the standard paper-form layout is in use.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(fields ?? []).map((field) => (
                <li key={field.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm text-foreground">
                      {field.label}
                      {field.required ? <span className="text-destructive"> *</span> : null}
                      {!field.is_active ? (
                        <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {FORMS.find((f) => f.value === field.form_type)?.label} ·{" "}
                      {TYPES.find((t) => t.value === field.field_type)?.label}
                      {field.options.length ? ` · ${field.options.join(", ")}` : ""}
                    </p>
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(field.id, !field.is_active)}
                      >
                        {field.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeField(field.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Add a field"
          description={isAdmin ? "Saved for everyone on this account." : "Administrators only."}
        >
          <div className="space-y-3">
            <Field label="Form">
              <select
                className={selectClass}
                value={draft.form_type}
                disabled={!isAdmin}
                onChange={(e) => setDraft({ ...draft, form_type: e.target.value })}
              >
                {FORMS.map((form) => (
                  <option key={form.value} value={form.value}>
                    {form.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Label">
              <Input
                value={draft.label}
                disabled={!isAdmin}
                maxLength={60}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <select
                className={selectClass}
                value={draft.field_type}
                disabled={!isAdmin}
                onChange={(e) => setDraft({ ...draft, field_type: e.target.value })}
              >
                {TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            {draft.field_type === "select" ? (
              <Field label="Choices" hint="Separate each choice with a comma.">
                <Input
                  value={draft.options}
                  disabled={!isAdmin}
                  onChange={(e) => setDraft({ ...draft, options: e.target.value })}
                />
              </Field>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={draft.required}
                disabled={!isAdmin}
                onCheckedChange={(checked) => setDraft({ ...draft, required: Boolean(checked) })}
              />
              Required before submitting
            </label>
            <Button className="w-full" disabled={!isAdmin || saving} onClick={addField}>
              <Plus className="size-4" /> Add field
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
