import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Only administrators can manage people.");
}

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      firstName: string;
      lastName: string;
      company: string;
      role: string;
      redirectTo: string;
    }) => {
      const email = input.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (!input.firstName.trim() || !input.lastName.trim())
        throw new Error("First and last name are required.");
      return { ...input, email };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        company: data.company,
        role: data.role,
      },
    });
    if (error) throw new Error(error.message);

    const userId = invited.user?.id;
    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          company: data.company,
        })
        .eq("id", userId);
      // Signup trigger gave the new user the default role; swap it for the invited one.
      await supabaseAdmin
        .from("user_roles")
        .update({ role: data.role as never })
        .eq("user_id", userId);
      await supabaseAdmin.from("activity_log").insert({
        actor_id: context.userId,
        action: "user_invited",
        entity_type: "user",
        entity_id: userId,
        summary: data.email,
      });
    }
    return { ok: true, email: data.email };
  });

export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.active })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : "876000h",
    });
    await supabaseAdmin.from("activity_log").insert({
      actor_id: context.userId,
      action: data.active ? "user_reactivated" : "user_deactivated",
      entity_type: "user",
      entity_id: data.userId,
    });
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot remove your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    const { data: theirRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isAdmin = (theirRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (isAdmin && (count ?? 0) <= 1) throw new Error("At least one administrator must remain.");

    await supabaseAdmin.from("activity_log").insert({
      actor_id: context.userId,
      action: "user_removed",
      entity_type: "user",
      entity_id: data.userId,
    });
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
