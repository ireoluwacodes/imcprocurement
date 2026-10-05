import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useApprovals, useForms, useProjects, useTeam } from "@/hooks/useIntegra";
import { PageHeader, Section } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, formatDate, money } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — Integra Procurement" },
      {
        name: "description",
        content: "Spend by project, transfer log, approval cycle time and pending work by role.",
      },
      { property: "og:title", content: "Reports & Analytics — Integra Procurement" },
      { property: "og:description", content: "Procurement spend, transfers and cycle time." },
    ],
  }),
  component: ReportsPage,
});

type Report = "spend" | "transfers" | "cycle" | "pending";

const REPORTS: { key: Report; label: string }[] = [
  { key: "spend", label: "Spend by project" },
  { key: "transfers", label: "Transfer log" },
  { key: "cycle", label: "Approval cycle time" },
  { key: "pending", label: "Pending by person" },
];

function toCsv(headers: string[], rows: (string | number)[][]) {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function ReportsPage() {
  const [report, setReport] = useState<Report>("spend");
  const { data: projects } = useProjects();
  const { data: prs } = useForms("purchase_requests");
  const { data: mtfs } = useForms("material_transfers");
  const { data: steps } = useApprovals();
  const { data: team } = useTeam();

  const table = useMemo(() => {
    if (report === "spend") {
      return {
        headers: ["Project", "Number", "Requests", "Committed spend"],
        rows: (projects ?? []).map((project) => {
          const rows = (prs ?? []).filter((r: any) => r.project_id === project.id);
          const total = rows.reduce((sum, r: any) => sum + Number(r.total ?? 0), 0);
          return [project.name, project.number, rows.length, money(total)];
        }),
      };
    }
    if (report === "transfers") {
      return {
        headers: ["MTF", "Date", "Project", "Type", "Lines", "Status"],
        rows: (mtfs ?? []).map((row: any) => [
          row.mtf_number,
          formatDate(row.transfer_date),
          row.projects?.name ?? "—",
          row.transfer_type ?? "—",
          (row.line_items as unknown[])?.length ?? 0,
          row.status,
        ]),
      };
    }
    if (report === "cycle") {
      const decided = (steps ?? []).filter((s) => s.decided_at);
      const byRole = new Map<string, number[]>();
      decided.forEach((s) => {
        const hours =
          (new Date(s.decided_at!).getTime() - new Date(s.created_at).getTime()) / 3_600_000;
        byRole.set(s.role, [...(byRole.get(s.role) ?? []), hours]);
      });
      return {
        headers: ["Role", "Decisions", "Average hours"],
        rows: Array.from(byRole.entries()).map(([role, hours]) => [
          ROLE_LABELS[role] ?? role,
          hours.length,
          (hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(1),
        ]),
      };
    }
    const pending = (steps ?? []).filter((s) => s.decision === "pending");
    const perPerson = new Map<
      string,
      { name: string; company: string; roles: string[]; count: number; oldest: number }
    >();
    const days = (iso: string) =>
      Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));

    pending.forEach((step) => {
      const owners = (team ?? []).filter((member) =>
        step.assignee_id ? member.id === step.assignee_id : member.roles.includes(step.role),
      );
      owners
        .filter((member) => member.is_active !== false)
        .forEach((member) => {
          const key = member.id;
          const entry = perPerson.get(key) ?? {
            name: `${member.first_name} ${member.last_name}`.trim() || member.email,
            company: member.company || "—",
            roles: member.roles.map((role) => ROLE_LABELS[role] ?? role),
            count: 0,
            oldest: 0,
          };
          entry.count += 1;
          entry.oldest = Math.max(entry.oldest, days(step.created_at));
          perPerson.set(key, entry);
        });
    });

    const unassigned = pending.filter(
      (step) =>
        !(team ?? []).some((member) =>
          step.assignee_id ? member.id === step.assignee_id : member.roles.includes(step.role),
        ),
    );

    const rows: (string | number)[][] = Array.from(perPerson.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => [
        entry.name,
        entry.company,
        entry.roles.join(", ") || "—",
        entry.count,
        entry.oldest,
      ]);

    if (unassigned.length) {
      rows.push(["Nobody assigned", "—", "—", unassigned.length, 0]);
    }

    return {
      headers: ["Person", "Company", "Roles", "Pending steps", "Oldest (days)"],
      rows,
    };
  }, [report, projects, prs, mtfs, steps, team]);

  function exportCsv() {
    const csv = toCsv(table.headers, table.rows as (string | number)[][]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `integra-${report}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Reporting & analytics"
        title="Reports"
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {REPORTS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setReport(item.key)}
            className={`rounded-sm border px-3 py-1.5 font-display text-xs uppercase tracking-[0.12em] ${
              report === item.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Section title={REPORTS.find((r) => r.key === report)!.label}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {table.headers.map((header) => (
                  <th key={header} className="rule-label px-3 py-2 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.length === 0 ? (
                <tr>
                  <td colSpan={table.headers.length} className="px-3 py-8 text-muted-foreground">
                    No data yet.
                  </td>
                </tr>
              ) : (
                table.rows.map((row, index) => (
                  <tr key={index} className="border-b border-border/60">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
