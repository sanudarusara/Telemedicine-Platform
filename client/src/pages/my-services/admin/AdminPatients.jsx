import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAllPatients,
} from "@/services/patientService";
import {
  Users, Search, Loader2, AlertCircle, RefreshCw,
  UserCircle, Phone, Heart, MapPin,
} from "lucide-react";

const BLOOD_GROUP_COLORS = {
  "A+": "border-red-200 bg-red-50 text-red-700",
  "A-": "border-red-200 bg-red-50 text-red-700",
  "B+": "border-blue-200 bg-blue-50 text-blue-700",
  "B-": "border-blue-200 bg-blue-50 text-blue-700",
  "AB+": "border-purple-200 bg-purple-50 text-purple-700",
  "AB-": "border-purple-200 bg-purple-50 text-purple-700",
  "O+": "border-green-200 bg-green-50 text-green-700",
  "O-": "border-green-200 bg-green-50 text-green-700",
};

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");

  const fetchPatients = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllPatients();
      setPatients(data);
    } catch (e) {
      setError(e?.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const filtered = patients.filter((p) => {
    const matchGender = genderFilter === "ALL" || p.gender === genderFilter;
    const matchSearch =
      p.phone?.includes(search) ||
      (p.address?.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.bloodGroup || "").includes(search.toUpperCase());
    return matchGender && (search === "" || matchSearch);
  });

  return (
    <DashboardLayout title="Patient Records">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Patient Records</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {patients.length} registered patient{patients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={fetchPatients}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10 rounded-2xl border-border/60"
              placeholder="Search by city, phone, blood group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {["ALL", "MALE", "FEMALE", "OTHER"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  genderFilter === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-[28px] border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No patients found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PatientCard key={p._id || p.userId} patient={p} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const PatientCard = ({ patient: p }) => (
  <Card className="rounded-[24px] border-border/60 hover:shadow-md transition-shadow">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <UserCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">
            Patient #{(p._id || p.userId || "").toString().slice(-6)}
          </p>
          {p.gender && (
            <p className="text-xs text-muted-foreground">{p.gender}</p>
          )}
        </div>
        {p.bloodGroup && (
          <Badge
            variant="outline"
            className={`ml-auto text-[10px] px-2 rounded-full shrink-0 ${BLOOD_GROUP_COLORS[p.bloodGroup] || ""}`}
          >
            {p.bloodGroup}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        {p.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{p.phone}</span>
          </div>
        )}
        {p.address?.city && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{[p.address.city, p.address.state, p.address.country].filter(Boolean).join(", ")}</span>
          </div>
        )}
        {p.allergies?.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Heart className="w-3 h-3 shrink-0 mt-0.5 text-destructive/70" />
            <span className="line-clamp-1">{p.allergies.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/40">
        <span>{(p.prescriptions?.length ?? 0)} prescriptions</span>
        <span>·</span>
        <span>{(p.medicalHistory?.length ?? 0)} history entries</span>
      </div>
    </CardContent>
  </Card>
);

export default AdminPatients;
