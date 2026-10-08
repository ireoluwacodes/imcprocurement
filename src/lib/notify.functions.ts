import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PURCHASE_STATUS_LABELS, STATUS_LABELS } from "@/lib/integra";

const FORMS = {
  purchase_request: {
    table: "purchase_requests",
    numberKey: "pr_number",
    label: "Purchase request",
    path: "purchase-requests",
  },
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

// Emails a form's creator and approver, except whoever made the change, about its current status
// (or a PR's purchase status). Everything in the email is read from the database; the caller only
// names the form and which status changed.
export const notifyStatusChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { formType: string; formId: string; field?: "status" | "purchase_status" }) => {
    if (!(input.formType in FORMS)) throw new Error("Unknown form type.");
    if (input.field === "purchase_status" && input.formType !== "purchase_request") {
      throw new Error("Only purchase requests have a purchase status.");
    }
    return input as { formType: keyof typeof FORMS; formId: string; field?: "status" | "purchase_status" };
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

    const hasRole = async (role: "admin" | "procurement") =>
      (await context.supabase.rpc("has_role", { _user_id: context.userId, _role: role })).data === true;
    const allowed =
      context.userId === record.created_by ||
      context.userId === record.approver_id ||
      (await hasRole("admin")) ||
      (data.formType === "purchase_request" && (await hasRole("procurement")));
    if (!allowed) throw new Error("You can't send updates for this form.");

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
    const purchaseUpdate = data.field === "purchase_status";
    const status = purchaseUpdate
      ? (PURCHASE_STATUS_LABELS[record["purchase_status"]] ?? record["purchase_status"])
      : (STATUS_LABELS[record.status] ?? record.status);
    const link = `${new URL(getRequest().url).origin}/${form.path}/${record.id}`;
    const comments = !purchaseUpdate && record.status !== "submitted" ? lastDecision?.comments : null;

    let sent = 0;
    for (const person of people ?? []) {
      if (!person.email) continue;
      const waitingOnThem = !purchaseUpdate && record.status === "submitted" && person.id === record.approver_id;
      const subject = waitingOnThem ? `${number} is waiting for your approval` : `${number}: ${status}`;
      const text = [
        waitingOnThem
          ? `${form.label} ${number} was submitted and is waiting for your approval.`
          : `${form.label} ${number} is now ${status}${purchaseUpdate ? " (purchase status)" : ""}.`,
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
