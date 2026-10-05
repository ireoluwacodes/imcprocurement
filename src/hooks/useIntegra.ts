import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
}

export function useProfile() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyRoles() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row) => row.role as string);
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("last_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (profiles ?? []).map((profile) => ({
        ...profile,
        roles: (roles ?? []).filter((r) => r.user_id === profile.id).map((r) => r.role as string),
      }));
    },
  });
}

type FormTable = "purchase_requests" | "equipment_substitutions" | "material_transfers";

export function useForms(table: FormTable) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*, projects(name, number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFormRecord(table: FormTable, id: string) {
  return useQuery({
    queryKey: [table, id],
    enabled: id !== "new",
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useActivity(limit = 300) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIsAdmin() {
  const { data: roles } = useMyRoles();
  return (roles ?? []).includes("admin");
}

export function useApprovals(formId?: string) {
  return useQuery({
    queryKey: ["approvals", formId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("approvals").select("*").order("step_order");
      if (formId) query = query.eq("form_id", formId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type FormFieldDef = {
  id: string;
  form_type: string;
  field_key: string;
  label: string;
  field_type: string;
  options: string[];
  required: boolean;
  sort_order: number;
  version: number;
  is_active: boolean;
};

export function useFormFields(formType?: FormTable) {
  return useQuery({
    queryKey: ["form-fields", formType ?? "all"],
    queryFn: async () => {
      let query = supabase.from("form_fields").select("*").order("sort_order");
      if (formType) query = query.eq("form_type", formType).eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FormFieldDef[];
    },
  });
}

export function useProjectMembers() {
  return useQuery({
    queryKey: ["project-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_members").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Parts, descriptions and vendors already used on this account — powers type-ahead. */
export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const [{ data: prs }, { data: mtfs }] = await Promise.all([
        supabase.from("purchase_requests").select("vendor, line_items"),
        supabase.from("material_transfers").select("vendor_name, line_items"),
      ]);
      const parts = new Set<string>();
      const descriptions = new Set<string>();
      const vendors = new Set<string>();
      const collect = (rows: any[] | null) =>
        (rows ?? []).forEach((row) => {
          if (row.vendor) vendors.add(row.vendor);
          if (row.vendor_name) vendors.add(row.vendor_name);
          ((row.line_items as any[]) ?? []).forEach((line) => {
            if (line?.part) parts.add(String(line.part));
            if (line?.description) descriptions.add(String(line.description));
          });
        });
      collect(prs as any[]);
      collect(mtfs as any[]);
      const sorted = (set: Set<string>) => Array.from(set).sort();
      return { parts: sorted(parts), descriptions: sorted(descriptions), vendors: sorted(vendors) };
    },
  });
}

export type InventoryRow = {
  id: string;
  project_id: string | null;
  connex_id: string | null;
  name: string;
  serial_number: string | null;
  category: string;
  unit: string;
  starting_qty: number;
  added: number;
  used: number;
  adjusted: number;
  remaining: number;
  created_at: string;
};

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const [{ data: items, error }, { data: moves, error: e2 }] = await Promise.all([
        supabase.from("inventory_items").select("*").order("name"),
        supabase.from("inventory_movements").select("item_id, movement_type, quantity"),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      return (items ?? []).map((item: any): InventoryRow => {
        const m = (moves ?? []).filter((x: any) => x.item_id === item.id);
        const sum = (t: string) =>
          m.filter((x: any) => x.movement_type === t).reduce((s, x: any) => s + Number(x.quantity), 0);
        const added = sum("added");
        const used = sum("used");
        const adjusted = sum("adjusted");
        const start = Number(item.starting_qty);
        return { ...item, starting_qty: start, added, used, adjusted, remaining: start + added - used + adjusted };
      });
    },
  });
}

export function useInventoryMovements(itemIds: string[]) {
  return useQuery({
    queryKey: ["inventory-movements", itemIds.join(",")],
    enabled: itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .in("item_id", itemIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type Connex = { id: string; project_id: string; name: string; notes: string | null; created_at: string };

export function useConnexes() {
  return useQuery({
    queryKey: ["connexes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("connexes").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Connex[];
    },
  });
}
