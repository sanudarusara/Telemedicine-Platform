import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Old pages
import Home from "./pages/home/Home";
import DummyPayment from "./pages/payment/DummyPayment";
import AiSymptomServicePage from "./pages/ai-service/AiSymptomServicePage";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";

// New lovable pages
import Index from "./pages/Index.jsx";
import LoginPage from "./pages/LoginPage";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import NotFound from "./pages/NotFound.tsx";

// Doctor pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import DoctorAppointments from "./pages/doctor/DoctorAppointments.jsx";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions.jsx";
import DoctorProfile from "./pages/doctor/DoctorProfile.jsx";
import DoctorVideoConsult from "./pages/doctor/DoctorVideoConsult.jsx";
import DoctorRegister from "./pages/doctor/DoctorRegister.jsx";

// Existing pages kept as they were
import Appointments from "./pages/Appointments.jsx";
import VideoConsultation from "./pages/VideoConsultation.jsx";
import ConsultationPage from "./pages/appointments/ConsultationPage";
import Prescriptions from "./pages/Prescriptions.jsx";
import Profile from "./pages/Profile.jsx";

// ── my-services: Patient Management ──────────────────────────────────────────
import PatientProfilePage from "./pages/my-services/patient/PatientProfilePage.jsx";
import PatientMedicalHistory from "./pages/my-services/patient/PatientMedicalHistory.jsx";
import PatientReports from "./pages/my-services/patient/PatientReports.jsx";
import PatientPrescriptions from "./pages/my-services/patient/PatientPrescriptions.jsx";

// ── my-services: Admin ────────────────────────────────────────────────────────
import AdminDashboard from "./pages/my-services/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/my-services/admin/AdminUsers.jsx";
import AdminPatients from "./pages/my-services/admin/AdminPatients.jsx";
import AdminDoctorVerification from "./pages/my-services/admin/AdminDoctorVerification.jsx";
import AdminPayments from "./pages/my-services/admin/AdminPayments.jsx";
import GatewayStatusPage from "./pages/my-services/admin/GatewayStatusPage";

// ── my-services: Audit ────────────────────────────────────────────────────────
import AuditLogs from "./pages/my-services/audit/AuditLogs.tsx";

const queryClient = new QueryClient();

const PaymentSuccess = () => <h2>Payment Successful</h2>;
const PaymentCancel = () => <h2>Payment Cancelled</h2>;

type ProtectedRouteProps = {
  children: ReactNode;
};

/** Generic guard — requires any valid token (patient, admin, or doctor). */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/** Doctor-only guard. */
const ProtectedDoctorRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated || role !== "doctor")
    return <Navigate to="/doctor/login" replace />;
  return <>{children}</>;
};

/** Patient-only guard. */
const ProtectedPatientRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated || role === "doctor")
    return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Admin-only guard. */
const ProtectedAdminRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/patient-dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          {/* Home opens first */}
          <Route path="/" element={<Index />} />
          {/* Unified login — all roles (patient, doctor, admin) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Old routes */}
          <Route path="/ai-symptom-service" element={<AiSymptomServicePage />} />
          <Route path="/payment" element={<DummyPayment />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          {/* Doctor registration (public) */}
          <Route path="/doctor/register" element={<DoctorRegister />} />

          {/* Legacy login routes — redirect to unified /login */}
          <Route path="/doctor/login" element={<LoginPage />} />
          <Route path="/patient-login" element={<LoginPage />} />

          {/* Doctor routes updated */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedDoctorRoute>
                <DoctorDashboard />
              </ProtectedDoctorRoute>
            }
          />
          <Route
            path="/doctor/appointments"
            element={
              <ProtectedDoctorRoute>
                <DoctorAppointments />
              </ProtectedDoctorRoute>
            }
          />
          <Route
            path="/doctor/prescriptions"
            element={
              <ProtectedDoctorRoute>
                <DoctorPrescriptions />
              </ProtectedDoctorRoute>
            }
          />
          <Route
            path="/doctor/video-consultation"
            element={
              <ProtectedDoctorRoute>
                <DoctorVideoConsult />
              </ProtectedDoctorRoute>
            }
          />
          <Route
            path="/doctor/profile"
            element={
              <ProtectedDoctorRoute>
                <DoctorProfile />
              </ProtectedDoctorRoute>
            }
          />

          {/* Patient kept unchanged */}
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/appointments/consultation" element={<ConsultationPage />} />
          <Route
            path="/doctor-appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-consultation"
            element={
              <ProtectedRoute>
                <VideoConsultation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prescriptions"
            element={
              <ProtectedRoute>
                <Prescriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />

          {/* ── Patient Management Service ─────────────────────────────────── */}
          <Route
            path="/patient/profile"
            element={
              <ProtectedPatientRoute>
                <PatientProfilePage />
              </ProtectedPatientRoute>
            }
          />
          <Route
            path="/patient/medical-history"
            element={
              <ProtectedPatientRoute>
                <PatientMedicalHistory />
              </ProtectedPatientRoute>
            }
          />
          <Route
            path="/patient/reports"
            element={
              <ProtectedPatientRoute>
                <PatientReports />
              </ProtectedPatientRoute>
            }
          />
          <Route
            path="/patient/prescriptions"
            element={
              <ProtectedPatientRoute>
                <PatientPrescriptions />
              </ProtectedPatientRoute>
            }
          />
          <Route
            path="/patient/ai-symptoms"
            element={
              <ProtectedPatientRoute>
                <AiSymptomServicePage />
              </ProtectedPatientRoute>
            }
          />

          {/* ── Admin routes ───────────────────────────────────────────────── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedAdminRoute>
                <AdminUsers />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedAdminRoute>
                <AdminPatients />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedAdminRoute>
                <AuditLogs />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/gateway-status"
            element={
              <ProtectedAdminRoute>
                <GatewayStatusPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/doctor-verification"
            element={
              <ProtectedAdminRoute>
                <AdminDoctorVerification />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedAdminRoute>
                <AdminPayments />
              </ProtectedAdminRoute>
            }
          />
          {/* Doctors also have read access to audit logs */}
          <Route
            path="/doctor/audit"
            element={
              <ProtectedDoctorRoute>
                <AuditLogs />
              </ProtectedDoctorRoute>
            }
          />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;