// client/src/components/DashboardLayout.tsx
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import PatientDashboardSidebar from "./PatientDashboardSidebar";
import AdminSidebar from "./AdminSidebar";
import { Bell, CheckCircle, XCircle, Calendar, Clock, MapPin, User, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';

const DashboardLayout = ({ children, title }) => {
  const { user, role, initials, userId } = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      const r = (localStorage.getItem("role") || (u && (u.role || u.roleName)) || "").toLowerCase();
      let initials = "DR";
      let uid = null;
      
      if (u) {
        uid = u._id || u.id || u.userId || u.patientId || null;
        if (u.name) {
          initials = u.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
        }
      } else if (r === "patient") {
        initials = "PT";
      }
      
      return { user: u, role: r, initials, userId: uid };
    } catch (e) {
      return { user: null, role: null, initials: "DR", userId: null };
    }
  }, []);

  const SidebarComponent =
    role === "patient"
      ? PatientDashboardSidebar
      : role === "admin"
      ? AdminSidebar
      : DashboardSidebar;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SidebarComponent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/60 px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsPopover userId={userId} role={role} />
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const NotificationsPopover = ({ userId, role }) => {
  const [unreadCount] = useState(0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {role === 'patient' ? 'Patient' : 'Doctor'}
            </span>
          </div>
        </div>

        <div className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">Notifications fetching disabled</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DashboardLayout;