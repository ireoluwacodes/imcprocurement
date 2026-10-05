import { createFileRoute, Link } from "@tanstack/react-router";
import { useInventory, useProjects } from "@/hooks/useIntegra";
import { PageHeader, Section } from "@/components/FormShell";
import { InventoryPanel } from "@/components/InventoryTable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Integra Procurement" },
      { name: "description", content: "Central warehouse stock and totals across every project site." },
      { property: "og:title", content: "Inventory — Integra Procurement" },
      { property: "og:description", content: "Warehouse and site stock in one view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { data: inventory } = useInventory();
  const { data: projects } = useProjects();
  const all = inventory ?? [];
  const warehouse = all.filter((i) => !i.project_id);
  const locName = (pid: string | null) => (pid ? (projects ?? []).find((p) => p.id === pid)?.name ?? "Project" : "Warehouse");

  const groups = new Map<string, { name: string; category: string; unit: string; start: number; used: number; remaining: number; sites: Map<string, number> }>();
  for (const i of all) {
    const key = `${i.name.toLowerCase()}|${i.unit}`;
    const g = groups.get(key) ?? { name: i.name, category: i.category, unit: i.unit, start: 0, used: 0, remaining: 0, sites: new Map() };
    g.start += i.starting_qty + i.added + i.adjusted;
    g.used += i.used;
    g.remaining += i.remaining;
    const loc = locName(i.project_id);
    g.sites.set(loc, (g.sites.get(loc) ?? 0) + i.remaining);
    groups.set(key, g);
  }
  const totals = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));

  function exportCsv() {
    const rows = [["Item", "Serial", "Category", "Location", "Started", "Added", "Used", "Remaining", "Unit"]];
    for (const i of all) rows.push([i.name, i.serial_number ?? "", i.category, locName(i.project_id), String(i.starting_qty), String(i.added + i.adjusted), String(i.used), String(i.remaining), i.unit]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "inventory.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="All sites" title="Inventory" />
      <Section title="Totals across all projects and the warehouse">
        <div className="mb-3 flex justify-end"><Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Item", "Category", "Total stocked", "Used", "Remaining", "Where"].map((h) => <th key={h} className="rule-label px-3 py-2 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {totals.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-muted-foreground">No inventory recorded yet.</td></tr>
              ) : totals.map((g) => (
                <tr key={g.name + g.unit} className="border-b border-border/60">
                  <td className="px-3 py-2 text-foreground">{g.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.category}</td>
                  <td className="px-3 py-2 font-mono">{g.start}</td>
                  <td className="px-3 py-2 font-mono">{g.used}</td>
                  <td className="px-3 py-2 font-mono text-primary">{g.remaining} {g.unit}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{[...g.sites].map(([s, n]) => `${s}: ${n}`).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Open a site from <Link to="/projects" className="text-primary">Projects</Link> to update its stock.
        </p>
      </Section>
      <InventoryPanel items={warehouse} projectId={null} title="Central warehouse" />
    </div>
  );
}
