import { LayoutDashboard, Server, CreditCard, Activity, Settings, LogOut, GitBranch, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const baseNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, superAdminOnly: false },
  { title: "Instâncias", url: "/instances", icon: Server, superAdminOnly: false },
  { title: "Subscrições", url: "/subscriptions", icon: CreditCard, superAdminOnly: false },
  { title: "Log de Actividade", url: "/activity", icon: Activity, superAdminOnly: false },
  { title: "Atualizações", url: "/updates", icon: GitBranch, superAdminOnly: false },
  { title: "Utilizadores", url: "/users", icon: Users, superAdminOnly: true },
  { title: "Definições", url: "/settings", icon: Settings, superAdminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();

  const navItems = baseNavItems.filter((i) => !i.superAdminOnly || isSuperAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary font-bold text-base tracking-wide">
            {!collapsed && "Admin Panel"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-sidebar-accent/50 text-sidebar-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
