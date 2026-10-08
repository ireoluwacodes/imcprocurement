import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useMyRoles, useTeam, useInventoryMovements, useConnexes, type InventoryRow } from "@/hooks/useIntegra";
import { Section, Field, NumberInput } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INVENTORY_CATEGORIES } from "@/lib/integra";

function Photo({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage.from("inventory-photos").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  if (!path) return <span className="text-muted-foreground">—</span>;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-10 w-10 rounded-sm object-cover" /></a>
  ) : <span className="text-xs text-muted-foreground">…</span>;
}

export function InventoryPanel({
  items,
  projectId,
  title,
}: {
  items: InventoryRow[];
  projectId: string | null;
  title: string;
}) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: roles } = useMyRoles();
  const { data: team } = useTeam();
  const r = roles ?? [];
  const canManage = r.includes("admin") || r.includes("project_manager");
  const canUse = canManage || r.includes("superintendent") || r.includes("installation");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [box, setBox] = useState("");
  const [draft, setDraft] = useState({ name: "", serial_number: "", category: "Material", quantity: "", unit: "ea", connex_id: "" });
  const [newConnex, setNewConnex] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const { data: allConnexes } = useConnexes();
  const connexes = projectId ? (allConnexes ?? []).filter((c) => c.project_id === projectId) : [];
  const connexName = (id: string | null) => (id ? connexes.find((c) => c.id === id)?.name ?? "—" : "Unassigned");

  async function addConnex() {
    if (!newConnex.trim() || !projectId) return;
    const { error } = await (supabase as any).from("connexes").insert({ project_id: projectId, name: newConnex.trim(), created_by: user?.id ?? null });
    if (error) { toast.error(error.message.includes("policy") ? "Only admins and project managers can add a connex." : error.message); return; }
    setNewConnex("");
    toast.success("Connex added");
    qc.invalidateQueries({ queryKey: ["connexes"] });
  }

  async function removeConnex(id: string, name: string) {
    if (!window.confirm(`Delete connex “${name}”? Its items stay on the project as unassigned.`)) return;
    const { error } = await (supabase as any).from("connexes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["connexes"] });
    refresh();
  }
  const { data: moves } = useInventoryMovements(items.map((i) => i.id));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["inventory-movements"] });
  };

  const shown = items.filter(
    (i) =>
      (!cat || i.category === cat) &&
      (!box || (box === "none" ? !i.connex_id : i.connex_id === box)) &&
      `${i.name} ${i.serial_number ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function addItem() {
    if (!draft.name.trim()) { toast.error("Item name is required."); return; }
    const serial = draft.serial_number.trim();
    let photo_path: string | null = null;
    if (photo) {
      photo_path = `${projectId ?? "warehouse"}/${crypto.randomUUID()}-${photo.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("inventory-photos").upload(photo_path, photo);
      if (up.error) { toast.error(`Photo upload failed: ${up.error.message}`); return; }
    }
    const { error } = await supabase.from("inventory_items").insert({
      project_id: projectId,
      connex_id: draft.connex_id || null,
      photo_path,
      name: draft.name.trim(),
      serial_number: serial || null,
      category: draft.category,
      unit: draft.unit || "ea",
      starting_qty: serial ? 1 : Number(draft.quantity) || 0,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(
        error.message.includes("duplicate") ? "That serial number is already recorded." : error.message,
      ); return; }
    toast.success("Item added");
    setPhoto(null);
    setDraft({ name: "", serial_number: "", category: draft.category, quantity: "", unit: "ea", connex_id: draft.connex_id } as typeof draft);
    refresh();
  }

  async function move(item: InventoryRow, type: "used" | "added" | "adjusted") {
    const label = type === "used" ? "How many were taken/used?" : type === "added" ? "How many to add?" : "Adjust by (use negative to reduce):";
    const q = window.prompt(`${item.name}: ${label}`, "1");
    if (q === null) return;
    const quantity = Number(q);
    if (!quantity || (type !== "adjusted" && quantity < 0)) { toast.error("Enter a valid quantity."); return; }
    if (type === "used" && quantity > item.remaining) { toast.error(`Only ${item.remaining} left.`); return; }
    const note = window.prompt("Note (optional)", "") ?? "";
    const { error } = await supabase.from("inventory_movements").insert({
      item_id: item.id,
      movement_type: type,
      quantity,
      note: note || null,
      created_by: user!.id,
    });
    if (error) { toast.error(error.message.includes("policy") ? "You don't have permission for that." : error.message); return; }
    toast.success("Stock updated");
    refresh();
  }

  async function removeItem(item: InventoryRow) {
    if (!window.confirm(`Remove “${item.name}” and its history?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  const who = (id: string) => {
    const p = (team ?? []).find((t) => t.id === id);
    return p ? `${p.first_name} ${p.last_name}`.trim() || p.email : "Unknown";
  };
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "Item";

  return (
    <div className="space-y-4">
      {projectId ? (
        <Section title="Connexes" description="Storage containers on this site. Each item can sit in one connex.">
          <div className="flex flex-wrap gap-2">
            {connexes.length === 0 ? <p className="text-sm text-muted-foreground">No connexes yet.</p> : connexes.map((c) => {
              const inBox = items.filter((i) => i.connex_id === c.id);
              return (
                <button key={c.id} type="button" onClick={() => setBox(box === c.id ? "" : c.id)} className={`rounded-sm border px-3 py-2 text-left text-sm ${box === c.id ? "border-primary" : "border-border"}`}>
                  <span className="block text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{inBox.length} items · {inBox.reduce((s, i) => s + i.remaining, 0)} left</span>
                  {canManage ? <span role="button" className="ml-2 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); removeConnex(c.id, c.name); }}>Delete</span> : null}
                </button>
              );
            })}
          </div>
          {canManage ? (
            <div className="mt-3 flex max-w-sm gap-2">
              <Input placeholder="New connex name (e.g. Connex 1)" value={newConnex} onChange={(e) => setNewConnex(e.target.value)} />
              <Button size="sm" onClick={addConnex}>Add connex</Button>
            </div>
          ) : null}
        </Section>
      ) : null}
      <Section title={title} description="Started with, used and what's left. Updated manually.">
        <div className="mb-3 flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search name or serial" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="h-9 rounded-sm border border-input bg-background px-3 text-sm text-foreground"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">All categories</option>
            {[...new Set([...INVENTORY_CATEGORIES, ...items.map((i) => i.category)])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {projectId ? (
            <select className="h-9 rounded-sm border border-input bg-background px-3 text-sm text-foreground" value={box} onChange={(e) => setBox(e.target.value)}>
              <option value="">All connexes</option>
              {connexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="none">Unassigned</option>
            </select>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Photo", "Item", "Serial #", ...(projectId ? ["Connex"] : []), "Category", "Started", "Added", "Used", "Remaining", ""].map((h, i) => (
                  <th key={h || i} className="rule-label px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={projectId ? 10 : 9} className="px-3 py-6 text-muted-foreground">No items yet.</td></tr>
              ) : (
                shown.map((i) => (
                  <tr key={i.id} className="border-b border-border/60">
                    <td className="px-3 py-2"><Photo path={(i as any).photo_path ?? null} /></td>
                    <td className="px-3 py-2 text-foreground">{i.name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{i.serial_number ?? "—"}</td>
                    {projectId ? <td className="px-3 py-2 text-muted-foreground">{connexName(i.connex_id)}</td> : null}
                    <td className="px-3 py-2 text-muted-foreground">{i.category}</td>
                    <td className="px-3 py-2 font-mono">{i.starting_qty}</td>
                    <td className="px-3 py-2 font-mono">{i.added + i.adjusted}</td>
                    <td className="px-3 py-2 font-mono">{i.used}</td>
                    <td className={`px-3 py-2 font-mono ${i.remaining <= 0 ? "text-destructive" : "text-primary"}`}>
                      {i.remaining} {i.unit}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {canUse ? <Button size="sm" variant="ghost" onClick={() => move(i, "used")}>Record usage</Button> : null}
                      {canManage ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => move(i, "added")}>Add stock</Button>
                          <Button size="sm" variant="ghost" onClick={() => move(i, "adjusted")}>Adjust</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeItem(i)}>Remove</Button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        {canManage ? (
          <Section title="Add item">
            <div className="space-y-3">
              <Field label="Item name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Serial number" hint="Serialised items are tracked one per record.">
                <Input value={draft.serial_number} onChange={(e) => setDraft({ ...draft, serial_number: e.target.value })} />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Category">
                  <select className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm text-foreground" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    {INVENTORY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Quantity">
                  <NumberInput disabled={!!draft.serial_number.trim()} value={draft.serial_number.trim() ? "1" : draft.quantity} onChange={(t) => setDraft({ ...draft, quantity: t })} />
                </Field>
                <Field label="Unit"><Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></Field>
              </div>
              {projectId ? (
                <Field label="Connex">
                  <select className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm text-foreground" value={draft.connex_id} onChange={(e) => setDraft({ ...draft, connex_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {connexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="Photo (optional)">
                <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </Field>
              <Button className="w-full" onClick={addItem}>Add item</Button>
            </div>
          </Section>
        ) : null}
        <Section title="Stock history" className={canManage ? "" : "lg:col-span-2"}>
          {(moves ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto text-sm">
              {(moves ?? []).map((m: any) => (
                <li key={m.id} className="flex justify-between gap-3 py-2">
                  <span>
                    <span className="text-foreground">{itemName(m.item_id)}</span>{" "}
                    <span className="text-muted-foreground">
                      {m.movement_type === "used" ? "−" : m.quantity >= 0 ? "+" : ""}
                      {Math.abs(m.quantity)} {m.movement_type}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {who(m.created_by)} · {new Date(m.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
