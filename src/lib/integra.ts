const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 6 random characters, prefixed to make a collision-resistant 9-char form ID. */
function randomSuffix(length = 6) {
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(length))
      : Array.from({ length }, () => Math.floor(Math.random() * 256));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function generateFormId(prefix: "PR" | "ES" | "MTF") {
  return `${prefix}-${randomSuffix()}`;
}

export const MODULES = ["Tank", "PDC", "Gen", "Chiller", "Other"] as const;
export const SHIP_METHODS = ["Ground", "Air"] as const;
export const SHIP_VIA = ["Will Call", "Vendor Truck", "Other"] as const;
export const PR_REASONS = [
  "Lost",
  "Damaged",
  "Not on BOM",
  "Incorrect BOM Qty",
  "Tools",
  "Consumables",
  "Safety",
  "Office Supplies",
  "Other",
] as const;
export const UOMS = ["EA", "BX", "FT", "LB", "GAL", "SET", "ROLL", "CS"] as const;
export const TRANSFER_TYPES = [
  "From Project",
  "To Order #",
  "Transfer Back to Vendor",
  "Return to Factory w/ PO#",
] as const;

export const APPROVAL_CHAIN = [
  { role: "superintendent", label: "Senior Superintendent" },
  { role: "executive", label: "Project Executive" },
  { role: "project_manager", label: "Project Manager" },
  { role: "trade_partner", label: "Trade Partners" },
  { role: "installation", label: "Installation Team" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  superintendent: "Senior Superintendent",
  executive: "Project Executive",
  project_manager: "Project Manager",
  trade_partner: "Trade Partner",
  installation: "Installation Team",
  procurement: "Procurement",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  revise: "Revise & Resubmit",
  completed: "Completed",
};

export const DECISION_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  approved_as_noted: "Approved as Noted",
  revise_resubmit: "Revise & Resubmit",
  rejected: "Rejected",
};

export function statusTone(status: string) {
  switch (status) {
    case "approved":
    case "completed":
      return "success" as const;
    case "rejected":
      return "destructive" as const;
    case "revise":
    case "in_review":
    case "submitted":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export type LineItem = {
  id: string;
  part: string;
  description: string;
  qty: number;
  uom: string;
  price: number;
  remarks?: string;
};

export function emptyLine(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    part: "",
    description: "",
    qty: 1,
    uom: "EA",
    price: 0,
    remarks: "",
  };
}

export function lineTotal(item: LineItem) {
  return (Number(item.qty) || 0) * (Number(item.price) || 0);
}

export function sumLines(items: LineItem[]) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export const PURCHASE_STATUSES = ["not_ordered", "ordered", "arrived"] as const;

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  not_ordered: "Not ordered",
  ordered: "Ordered",
  arrived: "Arrived",
};
