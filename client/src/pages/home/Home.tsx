import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Heart, Calendar, Brain, CreditCard, Video, Shield,
  ArrowRight, CheckCircle, Star, Menu, X,
} from "lucide-react";

const FEATURES = [
  {
    icon: Calendar,
    color: "bg-blue-100 text-blue-600",
    title: "Easy Appointments",
    desc: "Book, reschedule, or cancel appointments with your doctor in seconds.",
  },
  {
    icon: Brain,
    color: "bg-purple-100 text-purple-600",
    title: "AI Symptom Checker",
    desc: "Get preliminary health insights by describing your symptoms to our AI assistant.",
  },
  {
    icon: Video,
    color: "bg-green-100 text-green-600",
    title: "Video Consultations",
    desc: "Connect with licensed doctors via secure video calls from the comfort of your home.",
  },
  {
    icon: CreditCard,
    color: "bg-amber-100 text-amber-600",
    title: "Secure Payments",
    desc: "Pay for consultations and services securely through our integrated payment gateway.",
  },
  {
    icon: Shield,
    color: "bg-red-100 text-red-600",
    title: "Private & Secure",
    desc: "Your health data is encrypted and protected. Only you and your care team have access.",
  },
  {
    icon: Heart,
    color: "bg-pink-100 text-pink-600",
    title: "Holistic Care",
    desc: "Access prescriptions, medical history, and lab reports all in one unified platform.",
  },
];

const STEPS = [
  { num: "01", title: "Create Account", desc: "Register as a patient in under 2 minutes." },
  { num: "02", title: "Find a Doctor", desc: "Browse available doctors and their specialties." },
  { num: "03", title: "Book & Consult", desc: "Schedule a visit or start a video consultation." },
];

const Home = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 font-bold text-xl text-primary">
              <Heart className="w-5 h-5" /> MediCare
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition">How it works</a>
              <a href="#about" className="hover:text-foreground transition">About</a>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
              <Button size="sm" onClick={() => navigate("/login?register=1")}>Get Started</Button>
            </div>
            <button className="md:hidden p-2" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {menuOpen && (
            <div className="md:hidden pb-4 space-y-2 border-t border-border/40 pt-3">
              <a href="#features" className="block py-1.5 text-sm text-muted-foreground" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="block py-1.5 text-sm text-muted-foreground" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#about" className="block py-1.5 text-sm text-muted-foreground" onClick={() => setMenuOpen(false)}>About</a>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/login")}>Sign In</Button>
                <Button size="sm" className="flex-1" onClick={() => navigate("/login?register=1")}>Get Started</Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36 px-4">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Heart className="w-3.5 h-3.5" /> Trusted healthcare, wherever you are
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Your health,<br />
            <span className="text-primary">simplified.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            MediCare connects patients with doctors for appointments, video consultations,
            prescriptions, and AI-powered symptom checking — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("/login?register=1")}>
              Get started free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm text-muted-foreground">
            {["No credit card required", "HIPAA compliant", "Available 24/7"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need for better healthcare</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From booking appointments to getting AI health insights, MediCare covers every step of your healthcare journey.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-background rounded-xl border border-border/60 p-6 space-y-3 hover:shadow-md transition">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Get started in 3 steps</h2>
            <p className="text-muted-foreground">Simple, fast, and secure.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                  {num}
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────────────── */}
      <section id="about" className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="flex justify-center gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <blockquote className="text-xl font-medium italic text-foreground">
            "MediCare made it incredibly easy to consult with my doctor without leaving home.
            The AI symptom checker gave me peace of mind before my actual appointment."
          </blockquote>
          <p className="text-sm text-muted-foreground">— Sarah M., Patient</p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl font-bold tracking-tight">Ready to take control of your health?</h2>
          <p className="text-muted-foreground">Join thousands of patients and doctors on MediCare.</p>
          <Button size="lg" className="h-12 px-10 text-base" onClick={() => navigate("/login?register=1")}>
            Create your free account <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Heart className="w-4 h-4 text-primary" /> MediCare
          </div>
          <p>© {new Date().getFullYear()} MediCare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;