import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/FormShell";
import { FormsTable } from "@/components/FormsTable";
import { Button } from "@/components/ui/button";
import { useForms } from "@/hooks/useIntegra";
import { money, PURCHASE_STATUS_LABELS } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/purchase-requests/")({
  head: () => ({
    meta: [
      { title: "Purchase Requests — Integra Procurement" },
      {
        name: "description",
        content: "Track every purchase request, vendor and buyer handoff across projects.",
      },
      { property: "og:title", content: "Purchase Requests — Integra Procurement" },
      { property: "og:description", content: "Purchase request tracking across projects." },
    ],
  }),
  component: PurchaseRequests,
});

function PurchaseRequests() {
  const { data, isLoading } = useForms("purchase_requests");

  return (
    <div>
      <PageHeader
        eyebrow="PR-XXXXXX"
        title="Purchase Requests"
        actions={
          <Button asChild size="sm">
            <Link to="/purchase-requests/$id" params={{ id: "new" }}>
              New purchase request
            </Link>
          </Button>
        }
      />
      <FormsTable
        rows={data ?? []}
        loading={isLoading}
        numberKey="pr_number"
        to="/purchase-requests/$id"
        columns={[
          { key: "project", label: "Project", render: (row) => row.projects?.name ?? "—" },
          { key: "vendor", label: "Vendor" },
          { key: "required_date", label: "Required" },
          { key: "total", label: "Total", render: (row) => money(Number(row.total ?? 0)) },
          {
            key: "purchase_status",
            label: "Purchase status",
            render: (row) =>
              row.status === "draft"
                ? "—"
                : (PURCHASE_STATUS_LABELS[row.purchase_status ?? "not_ordered"] ?? "Not ordered"),
          },
        ]}
      />
    </div>
  );
}
