import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Replace, Truck, Clock } from "lucide-react";
import { PageHeader } from "@/components/FormShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useForms, useProjects } from "@/hooks/useIntegra";
import { money, formatDate } from "@/lib/integra";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Integra Procurement" },
      {
        name: "description",
        content: "Live procurement status across every Integra mission critical project.",
      },
      { property: "og:title", content: "Dashboard — Integra Procurement" },
      { property: "og:description", content: "Live procurement and transfer status." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const prs = useForms("purchase_requests");
  const subs = useForms("equipment_substitutions");
  const mtfs = useForms("material_transfers");
  const projects = useProjects();

  const prList = (prs.data ?? []) as any[];
  const pending = prList.filter((r) => ["submitted", "in_review"].includes(r.status)).length;
  const spend = prList.reduce((sum, r) => sum + Number(r.total ?? 0), 0);

  const recent = [
    ...prList.map((r) => ({ ...r, id: r.id, number: r.pr_number, kind: "PR" })),
    ...((subs.data ?? []) as any[]).map((r) => ({ ...r, id: r.id, number: r.es_number, kind: "ES" })),
    ...((mtfs.data ?? []) as any[]).map((r) => ({ ...r, id: r.id, number: r.mtf_number, kind: "MTF" })),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 8);

  const stats = [
    { label: "Purchase requests", value: prList.length, icon: ClipboardList },
    { label: "Substitutions", value: (subs.data ?? []).length, icon: Replace },
    { label: "Material transfers", value: (mtfs.data ?? []).length, icon: Truck },
    { label: "Awaiting approval", value: pending, icon: Clock },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operations overview"
        title="Dashboard"
        actions={
          <>
            <Button asChild size="sm">
              <Link to="/purchase-requests/$id" params={{ id: "new" }}>
                New PR
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/transfers/$id" params={{ id: "new" }}>
                New MTF
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="panel p-5">
            <stat.icon className="size-5 text-primary" />
            <p className="mt-3 font-display text-4xl text-foreground">{stat.value}</p>
            <p className="rule-label mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-base text-foreground">Recent activity</h2>
          <div className="mt-4 divide-y divide-border">
            {recent.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No forms yet. Start with a purchase request.
              </p>
            ) : (
              recent.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-primary">{row.number}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {row.projects?.name ?? "Unassigned project"} · {formatDate(row.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <p className="rule-label">Committed spend</p>
            <p className="mt-2 font-display text-3xl text-foreground">{money(spend)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {prList.length} purchase requests
            </p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base text-foreground">Active projects</h2>
              <Link
                to="/projects"
                className="group inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-primary"
              >
                All projects
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {(projects.data ?? []).slice(0, 5).map((project) => (
                <li key={project.id} className="text-sm">
                  <Link
                    to="/projects/$id"
                    params={{ id: project.id }}
                    className="text-foreground hover:text-primary"
                  >
                    {project.name}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {project.number}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
