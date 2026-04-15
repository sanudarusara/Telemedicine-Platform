import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  FileText,
  CalendarDays,
  Loader2,
  ClipboardList,
} from "lucide-react";

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:30081/api"}/doctors`;

const Prescriptions = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [prescriptions, setPrescriptions] = useState([]);

  const [formData, setFormData] = useState({
    appointmentNo: "",
    diagnosis: "",
    notes: "",
    items: [{ medicineName: "", quantity: 1 }],
  });

  const token = useMemo(() => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("doctorToken") ||
      sessionStorage.getItem("token") ||
      ""
    );
  }, []);

  const getHeaders = () => {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const fetchPrescriptions = async () => {
    try {
      setListLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/prescriptions`, {
        method: "GET",
        headers: getHeaders(),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch prescriptions");
      }

      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error fetching prescriptions");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const addMedicine = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { medicineName: "", quantity: 1 }],
    }));
  };

  const removeMedicine = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateMedicine = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: field === "quantity" ? Number(value) : value } : item
      ),
    }));
  };

  const resetForm = () => {
    setFormData({
      appointmentNo: "",
      diagnosis: "",
      notes: "",
      items: [{ medicineName: "", quantity: 1 }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const cleanedItems = formData.items.filter(
        (item) => item.medicineName.trim() && Number(item.quantity) > 0
      );

      const payload = {
        appointmentNo: formData.appointmentNo.trim(),
        diagnosis: formData.diagnosis.trim(),
        notes: formData.notes.trim(),
        items: cleanedItems.map((item) => ({
          medicineName: item.medicineName.trim(),
          quantity: Number(item.quantity),
        })),
      };

      const response = await fetch(`${API_BASE_URL}/prescriptions`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create prescription");
      }

      setSuccess(data.message || "Prescription created successfully");
      resetForm();
      setShowForm(false);
      fetchPrescriptions();
    } catch (err) {
      setError(err.message || "Error creating prescription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Prescriptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Manage Prescriptions</h2>
            <p className="text-sm text-muted-foreground">
              Create and view prescriptions connected to your backend
            </p>
          </div>

          <Button onClick={() => setShowForm((prev) => !prev)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "New Prescription"}
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-sm text-green-700">{success}</CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Create Prescription</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointmentNo">Appointment Number</Label>
                    <Input
                      id="appointmentNo"
                      placeholder="Enter appointment number (e.g. APT-000001)"
                      value={formData.appointmentNo}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          appointmentNo: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Input
                      id="diagnosis"
                      placeholder="Enter diagnosis"
                      value={formData.diagnosis}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          diagnosis: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Medicines</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMedicine}
                      className="gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Medicine
                    </Button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="sm:col-span-8 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Medicine Name
                        </Label>
                        <Input
                          placeholder="e.g. Paracetamol"
                          value={item.medicineName}
                          onChange={(e) =>
                            updateMedicine(index, "medicineName", e.target.value)
                          }
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateMedicine(index, "quantity", e.target.value)
                          }
                        />
                      </div>

                      <div className="sm:col-span-1">
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMedicine(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Save Prescription
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {listLoading ? (
            <Card>
              <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading prescriptions...
              </CardContent>
            </Card>
          ) : prescriptions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-foreground">No prescriptions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first prescription to see it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((rx) => {
              const appointment = rx.appointmentId;
              const createdDate = rx.createdAt
                ? new Date(rx.createdAt).toLocaleDateString()
                : "N/A";

              return (
                <Card key={rx._id} className="border-border/60 hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {rx.prescriptionNo || "Prescription"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <CalendarDays className="w-3 h-3" />
                          {createdDate}
                        </p>
                      </div>

                      <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full capitalize">
                        {rx.status || "issued"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Appointment Number
                        </p>
                        <p className="font-medium break-all">
                          {appointment?.appointmentNo || "N/A"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Center ID
                        </p>
                        <p className="font-medium break-all">
                          {rx.centerId || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Diagnosis
                      </p>
                      <p className="font-medium text-foreground">{rx.diagnosis}</p>
                    </div>

                    {rx.notes ? (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-foreground">{rx.notes}</p>
                      </div>
                    ) : null}

                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Medicines
                      </p>

                      <div className="space-y-2">
                        {Array.isArray(rx.items) && rx.items.length > 0 ? (
                          rx.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm border-b last:border-b-0 border-border/40 pb-2 last:pb-0"
                            >
                              <span className="font-medium text-foreground">
                                {item.medicineName}
                              </span>
                              <span className="text-muted-foreground">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No medicines listed</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Prescriptions;