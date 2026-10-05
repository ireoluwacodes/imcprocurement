import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/FormShell";
import { FormsTable } from "@/components/FormsTable";
import { Button } from "@/components/ui/button";
import { useForms } from "@/hooks/useIntegra";

export const Route = createFileRoute("/_authenticated/transfers/")({
  head: () => ({
    meta: [
      { title: "Material Transfers — Integra Procurement" },
      {
        name: "description",
        content: "Material transfer forms with part-level line items and dual signatures.",
      },
      { property: "og:title", content: "Material Transfers — Integra Procurement" },
      { property: "og:description", content: "Material transfers with dual signatures." },
    ],
  }),
  component: Transfers,
});

function Transfers() {
  const { data, isLoading } = useForms("material_transfers");

  return (
    <div>
      <PageHeader
        eyebrow="MTF-XXXXXX"
        title="Material Transfers"
        actions={
          <Button asChild size="sm">
            <Link to="/transfers/$id" params={{ id: "new" }}>
              New transfer
            </Link>
          </Button>
        }
      />
      <FormsTable
        rows={data ?? []}
        loading={isLoading}
        numberKey="mtf_number"
        to="/transfers/$id"
        columns={[
          { key: "project", label: "Project", render: (row) => row.projects?.name ?? "—" },
          { key: "transfer_type", label: "Type" },
          { key: "transferred_by_name", label: "Transferred by" },
          { key: "received_by_name", label: "Received by" },
        ]}
      />
    </div>
  );
}
