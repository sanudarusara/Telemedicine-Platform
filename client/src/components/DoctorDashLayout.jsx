import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import {
  Bell,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const DoctorDashLayout = ({ children, title }) => {
  const { initials, userId } = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;

      let initials = "DR";
      let uid = null;

      if (u) {
        uid = u._id || u.id || u.userId || u.doctorId || null;

        const fullName = u.name || u.fullName || u.doctorName || "";

        if (fullName) {
          initials = fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
        }
      }

      return { initials, userId: uid };
    } catch (e) {
      return { initials: "DR", userId: null };
    }
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/60 px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <NotificationsPopover userId={userId} />
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

const NotificationsPopover = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/notifications-api/notifications?userId=${userId}&limit=20`
      );
      const data = await response.json();

      if (response.ok) {
        const notifs = data.data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      } else {
        throw new Error(data.error || "Failed to load notifications");
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/notifications-api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, read: true } : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.notificationId);

    if (notification.appointmentId) {
      navigate(`/doctor/appointments?appointmentId=${notification.appointmentId}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

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
              Doctor
            </span>
          </div>
        </div>

        <div className="max-h-[450px] overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchNotifications}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Appointment updates will appear here
              </p>
            </div>
          )}

          {!loading && !error &&
            notifications.map((notification) => {
              const snapshot = notification.appointmentSnapshot;
              const patientName = snapshot?.patientName;

              return (
                <div
                  key={notification.notificationId}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b hover:bg-muted/50 cursor-pointer transition-all ${
                    !notification.read ? "bg-primary/5 border-l-4 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(notification.appointmentStatus)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm ${!notification.read ? "font-semibold" : ""}`}>
                          {notification.subject || "Appointment Update"}
                        </p>

                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                        )}
                      </div>

                      {snapshot ? (
                        <div className="space-y-1 mt-1">
                          <div className="flex items-center gap-1 text-xs">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{patientName || "Patient"}</span>
                            {snapshot.specialty && (
                              <span className="text-muted-foreground">• {snapshot.specialty}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(snapshot.date).toLocaleDateString()}</span>
                            <Clock className="w-3 h-3 ml-1" />
                            <span>{snapshot.timeSlot}</span>
                          </div>

                          <div className="flex items-center gap-1 text-xs">
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-xs ${
                                snapshot.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : snapshot.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : snapshot.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {snapshot.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        {getTimeAgo(notification.createdAt || notification.sentAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DoctorDashLayout;