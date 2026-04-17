import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  ShieldCheck,
  Heart,
  LogOut,
  Server,
  CreditCard,
  Stethoscope,
} from "lucide-react";
import { NavLink } from "@/components/NavLink.jsx";
import { useAuth } from "@/context/AuthContext";
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

const adminNavItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Doctor Verification", url: "/admin/doctor-verification", icon: Stethoscope },
  { title: "Patient Records", url: "/admin/patients", icon: UserCheck },
  { title: "Payment Oversight", url: "/admin/payments", icon: CreditCard },
  { title: "Audit Logs", url: "/admin/audit", icon: Activity },
  { title: "Gateway Status", url: "/admin/gateway-status", icon: Server },
];

const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout } = useAuth();

  const handleLogout = () => logout();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-foreground text-sm block">MediCare</span>
            <span className="text-[10px] text-muted-foreground">Admin Panel</span>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/60"
                      activeClassName="bg-primary/10 text-primary font-medium"
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

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {!collapsed && <span>Sign Out</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
