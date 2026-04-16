import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  UserCircle, Phone, MapPin, Heart, Save, Loader2,
  Plus, X, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  getPatientProfile,
  updatePatientProfile,
} from "@/services/patientService";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const inputClass =
  "flex h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

const selectClass = `${inputClass} cursor-pointer`;

const PatientProfilePage = () => {
  const [profile, setProfile] = useState({});
  const [allergyInput, setAllergyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getPatientProfile();
        setProfile(data);
      } catch (e) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setProfile((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const addAllergy = () => {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    setProfile((prev) => ({
      ...prev,
      allergies: [...(prev.allergies ?? []), trimmed],
    }));
    setAllergyInput("");
  };

  const removeAllergy = (idx) => {
    setProfile((prev) => ({
      ...prev,
      allergies: (prev.allergies ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const updated = await updatePatientProfile(profile);
      setProfile(updated);
      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-9 h-9 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{user?.name || "Patient"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Personal Info */}
            <Card className="rounded-[28px] border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <input
                    type="date"
                    className={inputClass}
                    value={profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : ""}
                    onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <select
                    className={selectClass}
                    value={profile.gender ?? ""}
                    onChange={(e) => handleChange("gender", e.target.value)}
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Blood Group</Label>
                  <select
                    className={selectClass}
                    value={profile.bloodGroup ?? ""}
                    onChange={(e) => handleChange("bloodGroup", e.target.value)}
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9 rounded-2xl border-border/60"
                      placeholder="+1 234 567 890"
                      value={profile.phone ?? ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="rounded-[28px] border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["street", "city", "state", "zipCode", "country"].map((field) => (
                  <div key={field} className={`space-y-1.5 ${field === "street" ? "sm:col-span-2" : ""}`}>
                    <Label className="text-xs text-muted-foreground capitalize">{field === "zipCode" ? "Zip Code" : field}</Label>
                    <Input
                      className="rounded-2xl border-border/60"
                      value={profile.address?.[field] ?? ""}
                      onChange={(e) => handleNestedChange("address", field, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="rounded-[28px] border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["name", "relationship", "phone"].map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground capitalize">{field}</Label>
                    <Input
                      className="rounded-2xl border-border/60"
                      value={profile.emergencyContact?.[field] ?? ""}
                      onChange={(e) => handleNestedChange("emergencyContact", field, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card className="rounded-[28px] border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-destructive" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    className="rounded-2xl border-border/60"
                    placeholder="e.g. Penicillin"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAllergy(); }}}
                  />
                  <Button type="button" variant="outline" size="icon" className="rounded-2xl shrink-0" onClick={addAllergy}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(profile.allergies ?? []).map((a, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1 rounded-full"
                    >
                      {a}
                      <button type="button" onClick={() => removeAllergy(i)}>
                        <X className="w-3 h-3 ml-0.5" />
                      </button>
                    </Badge>
                  ))}
                  {(profile.allergies ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No allergies recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-2xl px-8 h-11"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientProfilePage;
