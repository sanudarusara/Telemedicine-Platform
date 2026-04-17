import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Home from "./home/Home";

const Index = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Home />;
  if (role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/patient-dashboard" replace />;
};

export default Index;