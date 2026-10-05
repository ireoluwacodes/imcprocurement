import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentUser, useIsAdmin, useForms, useInventory, useProjectMembers, useProjects, useTeam } from "@/hooks/useIntegra";
import { PageHeader, Section } from "@/components/FormShell";
import { InventoryPanel } from "@/components/InventoryTable";
import { ROLE_LABELS, money } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project details — Integra Procurement" },
      { name: "description", content: "Project site inventory, team and linked forms." },
      { property: "og:title", content: "Project details — Integra Procurement" },
      { property: "og:description", content: "Site stock, team and forms for one project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectDetails,
});

function ProjectDetails() {
  const { id } = Route.useParams();
  const { data: projects, isLoading } = useProjects();
  const { data: inventory } = useInventory();
  const { data: members } = useProjectMembers();
  const { data: team } = useTeam();
  const { data: prs } = useForms("purchase_requests");
  const { data: ess } = useForms("equipment_substitutions");
  const { data: mtfs } = useForms("material_transfers");
  const project = (projects ?? []).find((p) => p.id === id);
  const { data: me } = useCurrentUser();
  const isAdmin = useIsAdmin();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!project) return <p className="text-muted-foreground">Project not found. <Link to="/projects" className="text-primary">Back to projects</Link></p>;

  const hasAccess = isAdmin || (members ?? []).some((m: any) => m.project_id === id && m.user_id === me?.id);
  if (members && !hasAccess)
    return (
      <div className="space-y-4">
        <Link to="/projects" className="text-xs text-muted-foreground hover:text-primary">← All projects</Link>
        <PageHeader eyebrow={project.number} title={project.name} />
        <p className="text-muted-foreground">You don't have access to this project. Ask an administrator to add you to its team.</p>
      </div>
    );

  const items = (inventory ?? []).filter((i) => i.project_id === id);
  const teamRows = (members ?? []).filter((m: any) => m.project_id === id);
  const projPrs = (prs ?? []).filter((r: any) => r.project_id === id);
  const projEs = (ess ?? []).filter((r: any) => r.project_id === id);
  const projMtf = (mtfs ?? []).filter((r: any) => r.project_id === id);

  return (
    <div className="space-y-4">
      <Link to="/projects" className="text-xs text-muted-foreground hover:text-primary">← All projects</Link>
      <PageHeader eyebrow={project.number} title={project.name} />
      <div className="grid gap-4 md:grid-cols-3">
        <Section title="Details">
          <dl className="space-y-1 text-sm">
            <div><dt className="rule-label inline">Client </dt><dd className="inline text-muted-foreground">{project.client ?? "—"}</dd></div>
            <div><dt className="rule-label inline">Location </dt><dd className="inline text-muted-foreground">{project.location ?? "—"}</dd></div>

          </dl>
        </Section>
        <Section title="Team">
          {teamRows.length === 0 ? <p className="text-sm text-muted-foreground">Nobody assigned yet.</p> : (
            <ul className="space-y-1 text-sm">
              {teamRows.map((m: any) => {
                const p = (team ?? []).find((t) => t.id === m.user_id);
                return <li key={m.id}>{p ? `${p.first_name} ${p.last_name}`.trim() || p.email : "Unknown"} <span className="text-xs text-muted-foreground">· {ROLE_LABELS[m.role] ?? m.role}</span></li>;
              })}
            </ul>
          )}
        </Section>
        <Section title="Forms">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/purchase-requests" className="text-primary">{projPrs.length} purchase requests</Link> · {money(projPrs.reduce((s, r: any) => s + Number(r.total ?? 0), 0))}</li>
            <li><Link to="/substitutions" className="text-primary">{projEs.length} substitutions</Link></li>
            <li><Link to="/transfers" className="text-primary">{projMtf.length} material transfers</Link></li>
          </ul>
        </Section>
      </div>
      <InventoryPanel items={items} projectId={id} title="Site inventory" />
    </div>
  );
}
