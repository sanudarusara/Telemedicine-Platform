import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Brain,
    Activity,
    ShieldAlert,
    Stethoscope,
    Sparkles,
    Loader2,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    ClipboardList,
    HeartPulse,
    ShieldCheck,
    X,
    Siren,
    CalendarPlus,
    FileText,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeSymptoms, type SymptomAnalysisResult } from "@/services/aiService";

const QUICK_SYMPTOMS = [
    "Fever",
    "Cough",
    "Headache",
    "Sore throat",
    "Body pain",
    "Shortness of breath",
    "Chest pain",
    "Dizziness",
    "Nausea",
    "Fatigue",
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];

type Severity = "LOW" | "MEDIUM" | "HIGH";

type SymptomFormData = {
    userId: string;
    symptoms: string[];
    age: string;
    gender: string;
    duration: string;
    additionalNotes: string;
};

function getSeverityStyles(severity?: Severity) {
    switch (severity) {
        case "HIGH":
            return {
                badge: "bg-red-100 text-red-800 border-red-200",
                ring: "border-red-200 bg-red-50/60",
            };
        case "MEDIUM":
            return {
                badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
                ring: "border-yellow-200 bg-yellow-50/60",
            };
        default:
            return {
                badge: "bg-green-100 text-green-800 border-green-200",
                ring: "border-green-200 bg-green-50/60",
            };
    }
}

export default function AiSymptomServicePage() {
    const [symptomInput, setSymptomInput] = useState<string>("");
    const [formData, setFormData] = useState<SymptomFormData>({
        userId: "user123",
        symptoms: [],
        age: "",
        gender: "",
        duration: "",
        additionalNotes: "",
    });

    const [result, setResult] = useState<SymptomAnalysisResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const symptomCount = formData.symptoms.length;

    const stats = useMemo(
        () => [
            {
                title: "AI Guidance",
                value: "24/7",
                label: "Preliminary support",
                icon: Brain,
                iconWrap: "bg-primary/10",
                iconColor: "text-primary",
            },
            {
                title: "Fast Response",
                value: "< 1 min",
                label: "Instant analysis flow",
                icon: Sparkles,
                iconWrap: "bg-violet-100",
                iconColor: "text-violet-700",
            },
            {
                title: "Symptom Review",
                value: "Smart",
                label: "Structured input and output",
                icon: ClipboardList,
                iconWrap: "bg-sky-100",
                iconColor: "text-sky-700",
            },
            {
                title: "Safety First",
                value: "Medical",
                label: "Includes care disclaimer",
                icon: ShieldCheck,
                iconWrap: "bg-emerald-100",
                iconColor: "text-emerald-700",
            },
        ],
        []
    );

    function addSymptom(symptom: string) {
        const clean = symptom.trim();
        if (!clean) return;

        const exists = formData.symptoms.some(
            (item) => item.toLowerCase() === clean.toLowerCase()
        );
        if (exists) return;

        setFormData((prev) => ({
            ...prev,
            symptoms: [...prev.symptoms, clean],
        }));
        setSymptomInput("");
    }

    function removeSymptom(symptomToRemove: string) {
        setFormData((prev) => ({
            ...prev,
            symptoms: prev.symptoms.filter((item) => item !== symptomToRemove),
        }));
    }

    function handleSymptomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addSymptom(symptomInput);
        }
    }

    function handleInputChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setResult(null);

        if (formData.symptoms.length === 0) {
            setError("Please add at least one symptom.");
            return;
        }

        try {
            setLoading(true);

            const response = await analyzeSymptoms({
                userId: formData.userId,
                symptoms: formData.symptoms,
                age: formData.age ? Number(formData.age) : undefined,
                gender: formData.gender || undefined,
                duration: formData.duration || undefined,
                additionalNotes: formData.additionalNotes || undefined,
            });

            setResult(response.data);
        } catch (err: unknown) {
            console.error("AI symptom analysis error:", err);
            setError(err instanceof Error ? err.message : "Something went wrong while analyzing symptoms.");
        } finally {
            setLoading(false);
        }
    }

    function handleClearForm() {
        setFormData({
            userId: "user123",
            symptoms: [],
            age: "",
            gender: "",
            duration: "",
            additionalNotes: "",
        });
        setSymptomInput("");
        setResult(null);
        setError("");
    }

    const severityStyles = getSeverityStyles(result?.severity);

    return (
        <div className="space-y-8 p-1 md:p-2">
            <div className="rounded-3xl border bg-gradient-to-br from-background to-muted/30 p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                            <Brain className="h-3.5 w-3.5" />
                            AI Symptom Service
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                                Check your symptoms with AI-guided preliminary support
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                                Describe your symptoms and receive a fast preliminary health
                                suggestion. This service helps users understand possible
                                conditions and decide whether they should monitor, seek care, or
                                book a doctor appointment.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
                                    <HeartPulse className="h-3.5 w-3.5" />
                                    Smart symptom review
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    Preliminary guidance only
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    Not a final diagnosis
                                </span>
                            </div>
                        </div>
                    </div>

                    <Card className="w-full max-w-md rounded-2xl border shadow-none">
                        <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                                    <Activity className="h-7 w-7 text-primary" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm text-muted-foreground">Service purpose</p>
                                    <p className="text-base font-semibold">
                                        Early symptom understanding
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Users can enter symptoms, get AI-based guidance, and move to
                                        the next step such as booking an appointment.
                                    </p>

                                    <Badge className="mt-3 rounded-full px-3 py-1">
                                        Entry point of AI service
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => (
                        <Card
                            key={stat.title}
                            className="h-full rounded-2xl border shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                                        <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {stat.label}
                                        </p>
                                    </div>

                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.iconWrap}`}
                                    >
                                        <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="rounded-3xl border shadow-sm">
                    <CardContent className="p-5 md:p-6">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">Tell us what you’re feeling</h2>
                            <p className="text-sm text-muted-foreground">
                                Add symptoms and a few supporting details so the AI service can
                                give a more helpful preliminary response.
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Symptoms</label>

                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type a symptom and press Enter"
                                        value={symptomInput}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setSymptomInput(e.target.value)
                                        }
                                        onKeyDown={handleSymptomKeyDown}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => addSymptom(symptomInput)}
                                    >
                                        Add
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {QUICK_SYMPTOMS.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => addSymptom(item)}
                                            className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>

                                <div className="min-h-[52px] rounded-2xl border bg-muted/20 p-3">
                                    {formData.symptoms.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No symptoms added yet
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.symptoms.map((symptom) => (
                                                <Badge
                                                    key={symptom}
                                                    variant="secondary"
                                                    className="flex items-center gap-1 rounded-full px-3 py-1"
                                                >
                                                    {symptom}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSymptom(symptom)}
                                                        className="ml-1"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    {symptomCount} symptom{symptomCount === 1 ? "" : "s"} added
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Age</label>
                                    <Input
                                        type="number"
                                        name="age"
                                        placeholder="23"
                                        value={formData.age}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="">Select gender</option>
                                        {GENDER_OPTIONS.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duration</label>
                                    <Input
                                        name="duration"
                                        placeholder="2 days"
                                        value={formData.duration}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Additional notes</label>
                                <Textarea
                                    name="additionalNotes"
                                    placeholder="Describe anything else that may help the analysis..."
                                    value={formData.additionalNotes}
                                    onChange={handleInputChange}
                                    rows={5}
                                />
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <div className="flex items-start gap-2">
                                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                    <p>
                                        This tool provides an AI-generated preliminary suggestion
                                        only. It does not replace a qualified medical professional or
                                        emergency care.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={loading} className="min-w-[180px]">
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            Analyze Symptoms
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClearForm}
                                >
                                    Clear Form
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="rounded-3xl border shadow-sm">
                        <CardContent className="p-5 md:p-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Analysis Result</h2>
                                <p className="text-sm text-muted-foreground">
                                    Your AI-generated preliminary response will appear here
                                </p>
                            </div>

                            {!result ? (
                                <div className="rounded-2xl border border-dashed p-8 text-center">
                                    <Brain className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm font-medium">No analysis yet</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Fill in the form and submit to see the result
                                    </p>
                                </div>
                            ) : (
                                <div className={`space-y-4 rounded-2xl border p-4 ${severityStyles.ring}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Suggested condition
                                            </p>
                                            <h3 className="text-lg font-semibold">
                                                {result.suggestedCondition || "—"}
                                            </h3>
                                        </div>

                                        <Badge className={`rounded-full border px-3 py-1 ${severityStyles.badge}`}>
                                            {result.severity || "LOW"} Severity
                                        </Badge>
                                    </div>

                                    <div className="rounded-2xl bg-background/80 p-4">
                                        <p className="text-sm text-muted-foreground">AI response</p>
                                        <p className="mt-2 text-sm leading-6">
                                            {result.aiResponse || "No response available."}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-background/70 p-4">
                                        <p className="text-sm font-medium">Important note</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            This is a preliminary AI suggestion only and should not be
                                            treated as a final diagnosis.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border shadow-sm">
                        <CardContent className="p-5 md:p-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Suggested Next Steps</h2>
                                <p className="text-sm text-muted-foreground">
                                    Help users continue after viewing the AI result
                                </p>
                            </div>

                            <div className="grid gap-3">
                                <Link
                                    to="/appointments"
                                    className="rounded-2xl border bg-muted/20 p-4 transition hover:bg-muted/40"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                                            <CalendarPlus className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Book Appointment</p>
                                            <p className="text-sm text-muted-foreground">
                                                Continue to doctor booking if symptoms need medical review
                                            </p>
                                        </div>
                                    </div>
                                </Link>

                                <Link
                                    to="/medical-reports"
                                    className="rounded-2xl border bg-muted/20 p-4 transition hover:bg-muted/40"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
                                            <FileText className="h-5 w-5 text-violet-700" />
                                        </div>
                                        <div>
                                            <p className="font-medium">View Medical Records</p>
                                            <p className="text-sm text-muted-foreground">
                                                Let users continue into the wider healthcare system
                                            </p>
                                        </div>
                                    </div>
                                </Link>

                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100">
                                            <Siren className="h-5 w-5 text-red-700" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Emergency warning</p>
                                            <p className="text-sm text-muted-foreground">
                                                If the patient has chest pain, breathing difficulty, or
                                                severe symptoms, advise immediate medical attention.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border shadow-sm">
                        <CardContent className="p-5 md:p-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                                </div>
                                <div>
                                    <p className="font-medium">Good first version for your project</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        This single page is enough to act as the public-facing AI
                                        symptom service page. Later you can add history, saved
                                        analyses, and deeper recommendations.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}