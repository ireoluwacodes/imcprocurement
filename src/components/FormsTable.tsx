import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { PRIORITIES, formatDate } from "@/lib/integra";

type Row = any;

export function FormsTable({
  rows,
  numberKey,
  to,
  columns,
  loading,
}: {
  rows: Row[];
  numberKey: string;
  to: "/purchase-requests/$id" | "/substitutions/$id" | "/transfers/$id";
  columns: { key: string; label: string; render?: (row: Row) => React.ReactNode }[];
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"priority" | "newest" | "oldest">("priority");
  const rank = (row: Row) => PRIORITIES.indexOf(row.priority ?? "normal");
  const filtered = rows
    .filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "priority") return rank(a) - rank(b) || diff;
      return sort === "newest" ? diff : -diff;
    });

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <Input
          placeholder="Search by number, project, vendor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "priority" | "newest" | "oldest")}
          className="h-9 rounded-sm border border-input bg-background px-3 text-sm text-foreground"
          aria-label="Sort"
        >
          <option value="priority">Highest priority</option>
          <option value="newest">Most recent</option>
          <option value="oldest">Older</option>
        </select>
        <button
          type="button"
          onClick={() => {
            const head = ["Number", "Priority", ...columns.map((c) => c.label), "Status", "Created"];
            const flat = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
            const lines = filtered.map((row) => [
              row[numberKey],
              row.priority ?? "normal",
              ...columns.map((c) => (c.key === "projects" ? row.projects?.name : row[c.key])),
              row.status,
              formatDate(row.created_at),
            ].map(flat));
            const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            a.download = `${numberKey.split("_")[0]}-forms.csv`;
            a.click();
          }}
          className="ml-auto rounded-full border border-border px-3.5 py-1.5 text-xs text-foreground hover:border-primary"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="rule-label px-4 py-3 text-left">Number</th>
              <th className="rule-label px-4 py-3 text-left">Priority</th>
              {columns.map((column) => (
                <th key={column.key} className="rule-label px-4 py-3 text-left">
                  {column.label}
                </th>
              ))}
              <th className="rule-label px-4 py-3 text-left">Status</th>
              <th className="rule-label px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 4} className="px-4 py-8 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 4} className="px-4 py-8 text-muted-foreground">
                  Nothing here yet.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link
                      to={to}
                      params={{ id: row.id }}
                      className="font-mono text-primary hover:underline"
                    >
                      {row[numberKey]}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.priority ?? "normal"} kind="priority" />
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-muted-foreground">
                      {column.render ? column.render(row) : (row[column.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
