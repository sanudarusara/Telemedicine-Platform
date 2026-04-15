import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, CreditCard } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-3xl w-full text-center space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Telemedicine Platform
          </h1>
          <p className="text-muted-foreground mt-2">
            Select a service to continue
          </p>
        </div>

        {/* Cards - First Row */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          
          {/* Payment */}
          <Card
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/payment")}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Payment Service</h2>
              <p className="text-sm text-muted-foreground">
                Proceed to make secure payments for appointments
              </p>
              <Button variant="outline">Go to Payment</Button>
            </CardContent>
          </Card>

          {/* AI Symptom */}
          <Card
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/ai-symptom-service")}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-purple-100">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold">AI Symptom Checker</h2>
              <p className="text-sm text-muted-foreground">
                Enter symptoms and get AI-based preliminary health suggestions
              </p>
              <Button variant="outline">Check Symptoms</Button>
            </CardContent>
          </Card>
        </div>

        {/* Cards - Second Row */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          
          {/* Appointments */}
          <Card
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/appointments")}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-amber-100">
                <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M8 7V3M16 7V3M3 11h18M5 21h14a2 2 0 0 0 2-2V8H3v11a2 2 0 0 0 2 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <h2 className="text-lg font-semibold">Appointments</h2>
              <p className="text-sm text-muted-foreground">View and manage scheduled appointments</p>
              <Button variant="outline">Go to Appointments</Button>
            </CardContent>
          </Card>

          {/* Consultation */}
          <Card
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/doctor-login")}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10a9 9 0 11-18 0 9 9 0 0118 0zM8 13l2.5-3L14 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <h2 className="text-lg font-semibold">Doctor Login</h2>
              <p className="text-sm text-muted-foreground">Search doctors and book consultations</p>
              <Button variant="outline">Doctor Login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;