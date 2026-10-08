import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCurrentUser,
  useForms,
  useMyRoles,
  useProjectMembers,
  useProjects,
  useTeam,
} from "@/hooks/useIntegra";
import { PageHeader, Section, Field } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INVENTORY_CATEGORIES, ROLE_LABELS, money } from "@/lib/integra";
import { APPROVAL_CHAIN } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Integra Procurement" },
      {
        name: "description",
        content: "Create and track projects with cost codes, spend and transfer activity.",
      },
      { property: "og:title", content: "Projects — Integra Procurement" },
      { property: "og:description", content: "Multi-project tracking and cost codes." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: user } = useCurrentUser();
  const { data: projects, isLoading } = useProjects();
  const { data: prs } = useForms("purchase_requests");
  const { data: mtfs } = useForms("material_transfers");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    name: "",
    number: "",
    costpoint_code: "",
    client: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<
    { name: string; serial_number: string; category: string; quantity: string; unit: string; connex: string; photo?: File | null }[]
  >([]);
  const [connexNames, setConnexNames] = useState<string[]>(["Connex 1"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: team } = useTeam();
  const { data: members } = useProjectMembers();
  const { data: myRoles } = useMyRoles();
  const canAssign = (myRoles ?? []).some((role) =>
    ["admin", "project_manager"].includes(role),
  );
  const isAdmin = (myRoles ?? []).includes("admin");
  const [selectedProject, setSelectedProject] = useState("");
  const [assignment, setAssignment] = useState({ user_id: "", role: "superintendent" });

  const activeProject = selectedProject || (projects ?? [])[0]?.id || "";
  const projectMembers = (members ?? []).filter((m: any) => m.project_id === activeProject);

  async function assignMember() {
    if (!activeProject || !assignment.user_id) {
      toast.error("Pick a project and a person.");
      return;
    }
    const { error } = await supabase.from("project_members").insert({
      project_id: activeProject,
      user_id: assignment.user_id,
      role: assignment.role as never,
    });
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Only administrators can give project access."
          : error.message.includes("duplicate")
            ? "That person is already assigned with this role."
            : error.message,
      );
      return;
    }
    toast.success("Assigned to project");
    setAssignment({ user_id: "", role: assignment.role });
    queryClient.invalidateQueries({ queryKey: ["project-members"] });
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from("project_members").delete().eq("id", memberId);
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Only administrators can remove project access."
          : error.message,
      );
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["project-members"] });
  }


  function startEdit(project: any) {
    setEditingId(project.id);
    setDraft({
      name: project.name ?? "",
      number: project.number ?? "",
      costpoint_code: project.costpoint_code ?? "",
      client: project.client ?? "",
      location: project.location ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ name: "", number: "", costpoint_code: "", client: "", location: "" });
    setResources([]);
    setConnexNames(["Connex 1"]);
  }

  async function saveProject() {
    if (!draft.name.trim() || !draft.number.trim()) {
      toast.error("Project name and number are required.");
      return;
    }
    setSaving(true);
    let error: { message: string } | null = null;
    if (editingId) {
      ({ error } = await supabase.from("projects").update(draft).eq("id", editingId));
    } else {
      const res = await supabase
        .from("projects")
        .insert({ ...draft, created_by: user?.id ?? null })
        .select("id")
        .single();
      error = res.error;
      const rows = resources.filter((r) => r.name.trim());
      const boxIds: Record<string, string> = {};
      const names = [...new Set(connexNames.map((n) => n.trim()).filter(Boolean))];
      if (!error && res.data && names.length) {
        const { data: boxes, error: cErr } = await (supabase as any)
          .from("connexes")
          .insert(names.map((name) => ({ project_id: res.data.id, name, created_by: user?.id ?? null })))
          .select("id, name");
        if (cErr) toast.error(`Project saved, but connexes failed: ${cErr.message}`);
        (boxes ?? []).forEach((b: any) => (boxIds[b.name] = b.id));
        queryClient.invalidateQueries({ queryKey: ["connexes"] });
      }
      if (!error && res.data && rows.length) {
        const paths: (string | null)[] = [];
        for (const r of rows) {
          if (!r.photo) { paths.push(null); continue; }
          const path = `${res.data.id}/${crypto.randomUUID()}-${r.photo.name.replace(/[^\w.-]/g, "_")}`;
          const up = await supabase.storage.from("inventory-photos").upload(path, r.photo);
          if (up.error) toast.error(`Photo for ${r.name} failed: ${up.error.message}`);
          paths.push(up.error ? null : path);
        }
        const { error: invError } = await supabase.from("inventory_items").insert(
          rows.map((r, idx) => ({
            photo_path: paths[idx] ?? null,
            project_id: res.data.id,
            connex_id: boxIds[r.connex.trim()] ?? null,
            name: r.name.trim(),
            serial_number: r.serial_number.trim() || null,
            category: r.category.trim() || "Other",
            unit: r.unit || "ea",
            starting_qty: r.serial_number.trim() ? 1 : Number(r.quantity) || 0,
            created_by: user?.id ?? null,
          })),
        );
        if (invError) toast.error(`Project saved, but starting stock failed: ${invError.message}`);
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }
    }
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Only administrators and project managers can change projects."
          : error.message,
      );
      return;
    }
    toast.success(editingId ? "Project updated" : "Project created");
    cancelEdit();
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  async function deleteProject(project: any) {
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Only administrators and project managers can delete projects."
          : error.message.includes("foreign key") || error.message.includes("violates")
            ? "This project still has requests, transfers or substitutions attached."
            : error.message,
      );
      return;
    }
    if (editingId === project.id) cancelEdit();
    if (selectedProject === project.id) setSelectedProject("");
    toast.success("Project deleted");
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Multi-project management" title="Projects" />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Project",
                  "Project ID",
                  "Cost code",
                  "Client",
                  "Requests",
                  "Committed",
                  "Transfers",
                  "",
                ].map((header, i) => (
                  <th key={header || `actions-${i}`} className="rule-label px-4 py-3 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (
                (projects ?? []).map((project) => {
                  const projectPrs = (prs ?? []).filter((r: any) => r.project_id === project.id);
                  const spend = projectPrs.reduce((sum, r: any) => sum + Number(r.total ?? 0), 0);
                  const transfers = (mtfs ?? []).filter((r: any) => r.project_id === project.id);
                  return (
                    <tr
                      key={project.id}
                      onClick={() => setSelectedProject(project.id)}
                      className={`cursor-pointer border-b border-border/60 ${
                        activeProject === project.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-foreground">
                        <Link
                          to="/projects/$id"
                          params={{ id: project.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{project.number}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {project.costpoint_code ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{project.client ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{projectPrs.length}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{money(spend)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{transfers.length}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canAssign ? (
                          <span className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(project);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project);
                              }}
                            >
                              Delete
                            </Button>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Section
          title={editingId ? "Edit project" : "New project"}
          description="Administrators and project managers can add, rename or delete projects."
        >
          <div className="space-y-3">
            <Field label="Project name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={120}
              />
            </Field>
            <Field label="Project ID">
              <Input
                value={draft.number}
                onChange={(e) => setDraft({ ...draft, number: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Cost code">
              <Input
                value={draft.costpoint_code}
                onChange={(e) => setDraft({ ...draft, costpoint_code: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Client">
              <Input
                value={draft.client}
                onChange={(e) => setDraft({ ...draft, client: e.target.value })}
                maxLength={120}
              />
            </Field>
            <Field label="Location">
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                maxLength={120}
              />
            </Field>
            {!editingId ? (
              <>
              <div className="space-y-2">
                <span className="rule-label block">Storage Facility i.e connex, site trailer</span>
                {connexNames.map((n, i) => (
                  <div key={i} className="flex gap-1">
                    <Input placeholder="Connex name" value={n} onChange={(e) => setConnexNames(connexNames.map((x, j) => (j === i ? e.target.value : x)))} />
                    <Button variant="ghost" size="sm" onClick={() => setConnexNames(connexNames.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setConnexNames([...connexNames, `Connex ${connexNames.length + 1}`])}>+ Add connex</Button>
              </div>
              <div className="space-y-2">
                <span className="rule-label block">Starting resources</span>
                {resources.map((r, i) => {
                  const set = (k: string, v: string) =>
                    setResources(resources.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                  return (
                    <div key={i} className="space-y-1 rounded-sm border border-border p-2">
                      <Input placeholder="Item name" value={r.name} onChange={(e) => set("name", e.target.value)} />
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="Serial # (optional)" value={r.serial_number} onChange={(e) => set("serial_number", e.target.value)} />
                        <select
                          className="h-9 rounded-sm border border-input bg-background px-2 text-sm text-foreground"
                          value={INVENTORY_CATEGORIES.includes(r.category) ? r.category : "Other"}
                          onChange={(e) => set("category", e.target.value === "Other" ? "" : e.target.value)}
                        >
                          {[...INVENTORY_CATEGORIES, "Other"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Qty"
                          disabled={!!r.serial_number.trim()}
                          value={r.serial_number.trim() ? "1" : r.quantity}
                          onChange={(e) => set("quantity", e.target.value)}
                        />
                        <Input placeholder="Unit (ea, ft…)" value={r.unit} onChange={(e) => set("unit", e.target.value)} />
                      </div>
                      {INVENTORY_CATEGORIES.includes(r.category) ? null : (
                        <Input autoFocus placeholder="Type (e.g. Safety gear)" value={r.category} onChange={(e) => set("category", e.target.value)} />
                      )}
                      <select
                        className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm text-foreground"
                        value={r.connex}
                        onChange={(e) => set("connex", e.target.value)}
                      >
                        <option value="">No connex</option>
                        {connexNames.filter((n) => n.trim()).map((n, k) => <option key={k} value={n.trim()}>{n.trim()}</option>)}
                      </select>
                      <label className="block text-xs text-muted-foreground">
                        Photo (optional)
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setResources(resources.map((x, j) => (j === i ? { ...x, photo: file } : x)));
                          }}
                        />
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => setResources(resources.filter((_, j) => j !== i))}>
                        Remove
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setResources([...resources, { name: "", serial_number: "", category: "Material", quantity: "", unit: "ea", connex: connexNames[0]?.trim() ?? "" }])
                  }
                >
                  + Add resource
                </Button>
              </div>
              </>
            ) : null}
            <Button className="w-full" disabled={saving} onClick={saveProject}>
              {editingId ? "Save changes" : "Create project"}
            </Button>
            {editingId ? (
              <Button variant="ghost" className="w-full" onClick={cancelEdit}>
                Cancel
              </Button>
            ) : null}
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section
          title="Project team"
          description={
            isAdmin
              ? "Select a project above, then give people access to it. Only assigned people can open a project."
              : "Only administrators can give people access to a project."
          }
        >
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div>
              <p className="rule-label mb-2">
                {(projects ?? []).find((p) => p.id === activeProject)?.name ?? "No project selected"}
              </p>
              {projectMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody assigned yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {projectMembers.map((member: any) => {
                    const person = (team ?? []).find((t) => t.id === member.user_id);
                    return (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="text-foreground">
                          {person
                            ? `${person.first_name} ${person.last_name}`.trim() || person.email
                            : "Unknown user"}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {person?.company}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {ROLE_LABELS[member.role] ?? member.role}
                          </span>
                          {isAdmin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(member.id)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <Field label="Person">
                <select
                  className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground"
                  value={assignment.user_id}
                  disabled={!isAdmin}
                  onChange={(e) => setAssignment({ ...assignment, user_id: e.target.value })}
                >
                  <option value="">Select person</option>
                  {(team ?? [])
                    .filter((person) => person.is_active !== false)
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {`${person.first_name} ${person.last_name}`.trim() || person.email}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Role on this project">
                <select
                  className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground"
                  value={assignment.role}
                  disabled={!isAdmin}
                  onChange={(e) => setAssignment({ ...assignment, role: e.target.value })}
                >
                  {APPROVAL_CHAIN.map((step) => (
                    <option key={step.role} value={step.role}>
                      {step.label}
                    </option>
                  ))}
                  <option value="procurement">Procurement</option>
                </select>
              </Field>
              <Button className="w-full" disabled={!isAdmin} onClick={assignMember}>
                Assign to project
              </Button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
