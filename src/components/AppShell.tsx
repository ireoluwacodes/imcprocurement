import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Replace,
  Truck,
  FolderKanban,
  Users,
  CheckSquare,
  BarChart3,
  Settings,
  History,
  UserCircle,
  LogOut,
  Menu,
  Boxes,
} from "lucide-react";
import logo from "@/assets/integra-mission-critical-logo.webp.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyRoles } from "@/hooks/useIntegra";
import { ROLE_LABELS } from "@/lib/integra";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/purchase-requests", label: "Purchase Requests", icon: ClipboardList },
  { to: "/substitutions", label: "Substitutions", icon: Replace },
  { to: "/transfers", label: "Material Transfers", icon: Truck },
  { to: "/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/team", label: "Team", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/profile", label: "My Profile", icon: UserCircle },
  { to: "/settings", label: "Form Setup", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const { data: roles } = useMyRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-sidebar-border px-4 py-4">
          <img src={logo.url} alt="Integra Mission Critical" className="h-8 w-auto" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2 font-display text-sm uppercase tracking-[0.08em] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {(roles ?? []).map((r) => ROLE_LABELS[r] ?? r).join(", ") || "No role"}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
            <Menu className="size-5" />
          </Button>
          <img src={logo.url} alt="Integra Mission Critical" className="h-6 w-auto" />
        </header>
        <div className="signal-bar h-0.5 w-full" />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
