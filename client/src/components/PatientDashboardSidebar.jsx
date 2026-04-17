import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Video,
  Clock,
  UserCircle,
  Heart,
  LogOut,
  FolderOpen,
  ClipboardList,
  Pill,
  Brain,
} from "lucide-react";
import { NavLink } from "@/components/NavLink.jsx";
import { useLocation } from "react-router-dom";
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

const patientNavItems = [
  { title: "Dashboard", url: "/patient-dashboard", icon: LayoutDashboard },
  { title: "Appointments", url: "/appointments", icon: CalendarDays },
  { title: "Consultation", url: "/appointments/consultation", icon: CalendarDays },
  { title: "My Profile", url: "/patient/profile", icon: UserCircle },
  { title: "Medical History", url: "/patient/medical-history", icon: ClipboardList },
  { title: "Reports", url: "/patient/reports", icon: FolderOpen },
  { title: "Prescriptions", url: "/patient/prescriptions", icon: Pill },
  { title: "AI Symptom Check", url: "/patient/ai-symptoms", icon: Brain },
  { title: "Video Consult", url: "/video-consultation", icon: Video },
];

const PatientDashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && <span className="font-bold text-foreground text-lg">MediCare</span>}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {patientNavItems.map((item) => (
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
                onClick={logout}
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

export default PatientDashboardSidebar;
