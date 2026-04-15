import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Old pages
import Home from "./pages/home/Home";
import DummyPayment from "./pages/payment/DummyPayment";
import AiSymptomServicePage from "./pages/ai-service/AiSymptomServicePage";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";
import AppointmentDetail from "./pages/appointments/AppointmentDetail";

// New lovable pages
import Login from "./pages/Login.jsx";
import PatientLogin from "./pages/PatientLogin.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Appointments from "./pages/Appointments.jsx";
import VideoConsultation from "./pages/VideoConsultation.jsx";
import ConsultationPage from "./pages/appointments/ConsultationPage";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import Prescriptions from "./pages/Prescriptions.jsx";
import Profile from "./pages/Profile.jsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const PaymentSuccess = () => <h2>Payment Successful</h2>;
const PaymentCancel = () => <h2>Payment Cancelled</h2>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Home opens first */}
          <Route path="/" element={<Home />} />

          {/* Old routes */}
          <Route path="/ai-symptom-service" element={<AiSymptomServicePage />} />
          <Route path="/payment" element={<DummyPayment />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          {/* New lovable doctor routes */}
          <Route path="/doctor-login" element={<Login />} />
          <Route path="/patient-login" element={<PatientLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/appointments/consultation" element={<ConsultationPage />} />
          <Route path="/doctor-appointments" element={<Appointments />} />
          <Route path="/video-consultation" element={<VideoConsultation />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;