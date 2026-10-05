import { Field, Section } from "@/components/FormShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormFields } from "@/hooks/useIntegra";

const selectClass =
  "h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

type FormTable = "purchase_requests" | "equipment_substitutions" | "material_transfers";

export function CustomFields({
  formType,
  values,
  onChange,
}: {
  formType: FormTable;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const { data: fields } = useFormFields(formType);
  if (!fields || fields.length === 0) return null;

  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });

  return (
    <Section title="Additional information" description="Fields configured by your administrator.">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const value = values?.[field.field_key];
          return (
            <Field
              key={field.id}
              label={field.required ? `${field.label} *` : field.label}
            >
              {field.field_type === "textarea" ? (
                <Textarea
                  rows={3}
                  maxLength={2000}
                  value={(value as string) ?? ""}
                  onChange={(e) => set(field.field_key, e.target.value)}
                />
              ) : field.field_type === "select" ? (
                <select
                  className={selectClass}
                  value={(value as string) ?? ""}
                  onChange={(e) => set(field.field_key, e.target.value)}
                >
                  <option value="">Select</option>
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.field_type === "checkbox" ? (
                <label className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={Boolean(value)}
                    onCheckedChange={(checked) => set(field.field_key, Boolean(checked))}
                  />
                  Yes
                </label>
              ) : (
                <Input
                  type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                  value={(value as string | number) ?? ""}
                  onChange={(e) =>
                    set(
                      field.field_key,
                      field.field_type === "number" ? Number(e.target.value) : e.target.value,
                    )
                  }
                />
              )}
            </Field>
          );
        })}
      </div>
    </Section>
  );
}

/** Returns the label of the first required custom field left empty, if any. */
export function missingCustomField(
  fields: { field_key: string; label: string; required: boolean }[] | undefined,
  values: Record<string, unknown>,
) {
  const missing = (fields ?? []).find((field) => {
    if (!field.required) return false;
    const value = values?.[field.field_key];
    return value === undefined || value === null || value === "" || value === false;
  });
  return missing?.label ?? null;
}
