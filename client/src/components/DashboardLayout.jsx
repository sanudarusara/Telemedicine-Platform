import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import PatientDashboardSidebar from "./PatientDashboardSidebar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

const DashboardLayout = ({ children, title }) => {
  const { user, role, initials } = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      const r = (localStorage.getItem("role") || (u && (u.role || u.roleName)) || "").toLowerCase();
      let initials = "DR";
      if (u && u.name) {
        initials = u.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
      } else if (r === "patient") {
        initials = "PT";
      }
      return { user: u, role: r, initials };
    } catch (e) {
      return { user: null, role: null, initials: "DR" };
    }
  }, []);

  const SidebarComponent = role === "patient" ? PatientDashboardSidebar : DashboardSidebar;

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
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              </Button>
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

export default DashboardLayout;
