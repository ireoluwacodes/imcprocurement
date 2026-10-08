import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/FormShell";
import { FormsTable } from "@/components/FormsTable";
import { Button } from "@/components/ui/button";
import { useForms, useTeam } from "@/hooks/useIntegra";

export const Route = createFileRoute("/_authenticated/substitutions/")({
  head: () => ({
    meta: [
      { title: "Equipment Substitutions — Integra Procurement" },
      {
        name: "description",
        content: "Equipment substitution and component transfer requests with approver review.",
      },
      { property: "og:title", content: "Equipment Substitutions — Integra Procurement" },
      { property: "og:description", content: "Substitution requests with approver review." },
    ],
  }),
  component: Substitutions,
});

function Substitutions() {
  const { data, isLoading } = useForms("equipment_substitutions");
  const { data: team } = useTeam();
  const approverName = (id: string | null) => {
    const member = team?.find((m) => m.id === id);
    return member ? `${member.first_name} ${member.last_name}`.trim() || member.email : "—";
  };

  return (
    <div>
      <PageHeader
        eyebrow="ES-XXXXXX"
        title="Equipment Substitutions"
        actions={
          <Button asChild size="sm">
            <Link to="/substitutions/$id" params={{ id: "new" }}>
              New substitution
            </Link>
          </Button>
        }
      />
      <FormsTable
        rows={data ?? []}
        loading={isLoading}
        numberKey="es_number"
        to="/substitutions/$id"
        columns={[
          { key: "project", label: "Project", render: (row) => row.projects?.name ?? "—" },
          { key: "specified_item", label: "Specified item" },
          { key: "from_equipment", label: "From" },
          { key: "approver_id", label: "Approver", render: (row) => approverName(row.approver_id) },
        ]}
      />
    </div>
  );
}
