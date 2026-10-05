import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useMyRoles, useTeam } from "@/hooks/useIntegra";
import { Section } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS } from "@/lib/integra";

export function Comments({ formType, formId }: { formType: string; formId: string }) {
  const { data: user } = useCurrentUser();
  const { data: myRoles } = useMyRoles();
  const { data: team } = useTeam();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = (myRoles ?? []).includes("admin");

  const { data: comments } = useQuery({
    queryKey: ["comments", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  function author(id: string) {
    const member = (team ?? []).find((m) => m.id === id);
    if (!member) return { name: "Team member", role: "", company: "" };
    return {
      name: `${member.first_name} ${member.last_name}`.trim() || member.email,
      role: member.roles.map((r) => ROLE_LABELS[r] ?? r).join(" · "),
      company: (member as { company?: string }).company ?? "",
    };
  }

  async function post() {
    if (!user || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("comments")
      .insert({ form_type: formType, form_id: formId, author_id: user.id, body: body.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    queryClient.invalidateQueries({ queryKey: ["comments", formId] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["comments", formId] });
  }

  return (
    <Section title="Comments" description="Anyone on the form can add notes. Comments are kept for the audit trail.">
      <ul className="space-y-3">
        {(comments ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">No comments yet.</li>
        ) : (
          (comments ?? []).map((comment) => {
            const who = author(comment.author_id);
            return (
              <li key={comment.id} className="rounded-sm border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xs uppercase tracking-[0.1em] text-foreground">
                      {who.name}
                      {who.company ? ` — ${who.company}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {who.role ? `${who.role} · ` : ""}
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                  {comment.author_id === user?.id || isAdmin ? (
                    <button
                      type="button"
                      onClick={() => remove(comment.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
              </li>
            );
          })
        )}
      </ul>
      <div className="mt-4 space-y-2">
        <Textarea
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <Button size="sm" onClick={post} disabled={busy || !body.trim()}>
          Post comment
        </Button>
      </div>
    </Section>
  );
}
