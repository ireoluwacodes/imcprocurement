import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STATUS_LABELS } from "@/lib/integra";

const FORMS = {
  equipment_substitution: {
    table: "equipment_substitutions",
    numberKey: "es_number",
    label: "Equipment substitution",
    path: "substitutions",
  },
  material_transfer: {
    table: "material_transfers",
    numberKey: "mtf_number",
    label: "Material transfer",
    path: "transfers",
  },
} as const;

// Emails a form's creator and approver, except whoever made the change, about its current status.
// Everything in the email is read from the database; the caller only names the form.
export const notifyStatusChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { formType: string; formId: string }) => {
    if (!(input.formType in FORMS)) throw new Error("Unknown form type.");
    return input as { formType: keyof typeof FORMS; formId: string };
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["EMAIL_FROM"];
    if (!apiKey || !from) {
      console.warn("[notify] RESEND_API_KEY or EMAIL_FROM is not set; status email skipped.");
      return { sent: 0 };
    }

    const form = FORMS[data.formType];
    const { data: row } = await context.supabase
      .from(form.table)
      .select("*")
      .eq("id", data.formId)
      .maybeSingle();
    const record = row as
      | ({ id: string; status: string; created_by: string; approver_id: string | null } & Record<string, any>)
      | null;
    if (!record) throw new Error("Form not found.");

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin && context.userId !== record.created_by && context.userId !== record.approver_id) {
      throw new Error("Only the creator, approver or an administrator can send updates.");
    }

    const recipientIds = [...new Set([record.created_by, record.approver_id])].filter(
      (id): id is string => Boolean(id) && id !== context.userId,
    );
    if (recipientIds.length === 0) return { sent: 0 };
    const { data: people } = await context.supabase
      .from("profiles")
      .select("id, email")
      .in("id", recipientIds);

    const { data: lastDecision } = await context.supabase
      .from("approvals")
      .select("comments")
      .eq("form_id", record.id)
      .not("decided_at", "is", null)
      .order("decided_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const number = record[form.numberKey];
    const status = STATUS_LABELS[record.status] ?? record.status;
    const link = `${new URL(getRequest().url).origin}/${form.path}/${record.id}`;
    const comments = record.status !== "submitted" ? lastDecision?.comments : null;

    let sent = 0;
    for (const person of people ?? []) {
      if (!person.email) continue;
      const waitingOnThem = record.status === "submitted" && person.id === record.approver_id;
      const subject = waitingOnThem ? `${number} is waiting for your approval` : `${number}: ${status}`;
      const text = [
        waitingOnThem
          ? `${form.label} ${number} was submitted and is waiting for your approval.`
          : `${form.label} ${number} is now ${status}.`,
        comments ? `\nComments: ${comments}` : "",
        `\nOpen it: ${link}`,
      ].join("\n");

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: person.email, subject, text }),
      });
      if (response.ok) sent += 1;
      else console.error(`[notify] Resend ${response.status}: ${await response.text()}`);
    }
    return { sent };
  });
