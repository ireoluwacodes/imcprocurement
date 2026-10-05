import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useMyRoles, useProfile } from "@/hooks/useIntegra";
import { PageHeader, Section, Field } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/integra";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Integra Procurement" },
      {
        name: "description",
        content: "Update your name, company, phone number and job title.",
      },
      { property: "og:title", content: "My Profile — Integra Procurement" },
      { property: "og:description", content: "Personal details used across forms and approvals." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const { data: roles } = useMyRoles();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company: "",
    phone: "",
    title: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      company: (profile as { company?: string }).company ?? "",
      phone: profile.phone ?? "",
      title: profile.title ?? "",
    });
  }, [profile]);

  async function save() {
    if (!user) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["team"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Account" title="My profile" />

      <div className="panel p-6">
        <Section title="Personal details" description="Shown on the forms and approvals you take part in.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </Field>
            <Field label="Company">
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Integra Mission Critical"
              />
            </Field>
            <Field label="Job title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input value={profile?.email ?? ""} readOnly className="opacity-70" />
            </Field>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Your roles: {(roles ?? []).map((r) => ROLE_LABELS[r] ?? r).join(", ") || "none yet"} ·
            Roles are assigned by an administrator.
          </p>
          <Button className="mt-4" onClick={save} disabled={busy}>
            Save changes
          </Button>
        </Section>
      </div>
    </div>
  );
}
