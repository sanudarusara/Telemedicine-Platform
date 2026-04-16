import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

// Old pages
import Home from "./pages/home/Home";
import DummyPayment from "./pages/payment/DummyPayment";
import AiSymptomServicePage from "./pages/ai-service/AiSymptomServicePage";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";

// New lovable pages
import Index from "./pages/Index.jsx";
import PatientLogin from "./pages/PatientLogin.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import NotFound from "./pages/NotFound.tsx";

// Doctor pages
import DoctorLogin from "./pages/doctor/DoctorLogin.jsx";
import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import DoctorAppointments from "./pages/doctor/DoctorAppointments.jsx";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions.jsx";
import DoctorProfile from "./pages/doctor/DoctorProfile.jsx";
import DoctorVideoConsult from "./pages/doctor/DoctorVideoConsult.jsx";

// Existing pages kept as they were
import Appointments from "./pages/Appointments.jsx";
import VideoConsultation from "./pages/VideoConsultation.jsx";
import ConsultationPage from "./pages/appointments/ConsultationPage";
import Prescriptions from "./pages/Prescriptions.jsx";
import Profile from "./pages/Profile.jsx";

const queryClient = new QueryClient();

const PaymentSuccess = () => <h2>Payment Successful</h2>;
const PaymentCancel = () => <h2>Payment Cancelled</h2>;

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const token =
    localStorage.getItem("doctor_token") ||
    localStorage.getItem("token") ||
    "";

  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const ProtectedDoctorRoute = ({ children }: ProtectedRouteProps) => {
  const token = localStorage.getItem("doctor_token") || "";
  return token ? <>{children}</> : <Navigate to="/doctor/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Home opens first */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Home />} />

          {/* Old routes */}
          <Route path="/ai-symptom-service" element={<AiSymptomServicePage />} />
          <Route path="/payment" element={<DummyPayment />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          {/* Doctor login updated */}
          <Route path="/doctor/login" element={<DoctorLogin />} />

          {/* Patient kept unchanged */}
          <Route path="/patient-login" element={<PatientLogin />} />

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
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;