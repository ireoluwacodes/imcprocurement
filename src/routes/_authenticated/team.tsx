import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles, useTeam } from "@/hooks/useIntegra";
import { inviteMember, setMemberActive, deleteMember } from "@/lib/admin.functions";
import { PageHeader, Section, Field } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team Directory — Integra Procurement" },
      {
        name: "description",
        content: "Invite people, assign workflow roles and manage access to the platform.",
      },
      { property: "og:title", content: "Team Directory — Integra Procurement" },
      { property: "og:description", content: "Member profiles, companies and role assignment." },
    ],
  }),
  component: TeamPage,
});

const ROLES = Object.keys(ROLE_LABELS);
const selectClass =
  "h-9 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

function TeamPage() {
  const { data: team, isLoading } = useTeam();
  const { data: myRoles } = useMyRoles();
  const queryClient = useQueryClient();
  const invite = useServerFn(inviteMember);
  const setActive = useServerFn(setMemberActive);
  const removeMember = useServerFn(deleteMember);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    role: "superintendent",
  });
  const isAdmin = (myRoles ?? []).includes("admin");
  const [newJob, setNewJob] = useState("");
  const { data: jobRoles } = useQuery({
    queryKey: ["job-roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("job_roles").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  async function addJobRole() {
    if (!newJob.trim()) return;
    const { error } = await (supabase as any).from("job_roles").insert({ name: newJob.trim() });
    if (error) { toast.error(error.message.includes("duplicate") ? "That role already exists." : error.message); return; }
    setNewJob("");
    queryClient.invalidateQueries({ queryKey: ["job-roles"] });
  }

  async function removeJobRole(id: string) {
    await (supabase as any).from("job_roles").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["job-roles"] });
  }

  async function setJobRole(userId: string, job: string) {
    const { error } = await supabase.from("profiles").update({ job_role: job || null } as never).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["team"] });
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  }

  async function toggleRole(userId: string, role: string, has: boolean) {
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as never)
      : await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
    if (error) {
      toast.error(
        error.message.includes("administrator must remain")
          ? "At least one administrator must remain."
          : error.message.includes("policy")
            ? "Only administrators can change roles."
            : error.message,
      );
      return;
    }
    refresh();
  }

  async function sendInvite() {
    setBusy(true);
    try {
      await invite({
        data: {
          ...draft,
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      toast.success(`Invitation sent to ${draft.email}`);
      setDraft({ email: "", firstName: "", lastName: "", company: "", role: "superintendent" });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(userId: string, active: boolean) {
    try {
      await setActive({ data: { userId, active } });
      toast.success(active ? "Access restored" : "Access suspended");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update access.");
    }
  }

  async function remove(userId: string, name: string) {
    if (!window.confirm(`Remove ${name}? Their past forms and approvals are kept.`)) return;
    try {
      await removeMember({ data: { userId } });
      toast.success("Member removed");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the member.");
    }
  }

  const rows = (team ?? []).filter((member) =>
    `${member.first_name} ${member.last_name} ${member.email} ${member.title ?? ""} ${
      (member as { company?: string }).company ?? ""
    }`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="People" title="Team directory" />

      {isAdmin ? (
        <Section title="Invite a team member" description="They receive an email invitation to set a password.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="First name">
              <Input
                value={draft.firstName}
                onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={draft.lastName}
                onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>
            <Field label="Company">
              <Input
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                placeholder="Integra Mission Critical"
              />
            </Field>
            <Field label="Starting role">
              <select
                className={selectClass}
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button className="mt-4" onClick={sendInvite} disabled={busy}>
            <UserPlus className="mr-2 h-4 w-4" />
            Send invitation
          </Button>
        </Section>
      ) : null}

      <Section title="Company roles" description="Job titles in the company. Approval permissions still come from the workflow roles on each person below.">
        <div className="flex flex-wrap gap-2">
          {(jobRoles ?? []).map((j) => (
            <span key={j.id} className="rounded-sm border border-border px-2 py-1 text-xs text-foreground">
              {j.name}
              {isAdmin ? <button type="button" className="ml-2 text-destructive" onClick={() => removeJobRole(j.id)}>×</button> : null}
            </span>
          ))}
        </div>
        {isAdmin ? (
          <div className="mt-3 flex max-w-sm gap-2">
            <Input placeholder="New role name" value={newJob} onChange={(e) => setNewJob(e.target.value)} />
            <Button size="sm" onClick={addJobRole}>Add role</Button>
          </div>
        ) : null}
      </Section>

      <div className="panel">
        <div className="border-b border-border p-4">
          <Input
            placeholder="Search name, email, company or title…"
            className="max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No members found.</p>
          ) : (
            rows.map((member) => {
              const name = `${member.first_name} ${member.last_name}`.trim() || member.email;
              const active = (member as { is_active?: boolean }).is_active !== false;
              return (
                <div key={member.id} className="flex flex-wrap gap-4 p-4">
                  <div className="min-w-56 flex-1">
                    <p className="text-foreground">
                      {name}
                      {active ? null : (
                        <span className="ml-2 text-xs uppercase tracking-[0.12em] text-destructive">
                          Suspended
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    {isAdmin ? (
                      <select
                        className="mt-1 h-8 rounded-sm border border-input bg-background px-2 text-xs text-foreground"
                        value={(member as any).job_role ?? ""}
                        onChange={(e) => setJobRole(member.id, e.target.value)}
                      >
                        <option value="">No company role</option>
                        {(jobRoles ?? []).map((j) => <option key={j.id}>{j.name}</option>)}
                      </select>
                    ) : (member as any).job_role ? (
                      <p className="text-xs text-primary">{(member as any).job_role}</p>
                    ) : null}
                    {(member as { company?: string }).company ? (
                      <p className="text-xs text-muted-foreground">
                        {(member as { company?: string }).company}
                      </p>
                    ) : null}
                    {member.phone ? (
                      <p className="text-xs text-muted-foreground">{member.phone}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {ROLES.map((role) => {
                      const has = member.roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => toggleRole(member.id, role, has)}
                          className={`rounded-sm border px-2 py-1 font-display text-[0.7rem] uppercase tracking-[0.12em] transition-colors ${
                            has
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          } ${isAdmin ? "" : "cursor-default opacity-70"}`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      );
                    })}
                    {isAdmin ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(member.id, !active)}
                        >
                          {active ? "Suspend" : "Restore"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(member.id, name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {!isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Invitations, role changes and removals are limited to administrators.
        </p>
      ) : null}
    </div>
  );
}
