"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  DollarSign,
  FileText,
  Sparkles,
  Stethoscope,
  User,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/features/patients/file-drop-zone";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import { cn, formatCurrency } from "@/lib/utils";
import type { Patient } from "@/types";

const SKIN_TYPES = ["normal", "dry", "oily", "combination", "sensitive"] as const;

type IntakeMode = "new" | "existing";

export function PatientIntakeForm({
  initialMode = "new",
  initialPatientUuid,
}: {
  initialMode?: IntakeMode;
  initialPatientUuid?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<IntakeMode>(initialMode);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [progressImages, setProgressImages] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    gender: "female",
    dob: "",
    address: "",
    skin_type: "combination",
    allergies: "",
    medical_history: "",
    notes: "",
    treatment_name: "",
    diagnosis: "",
    session_notes: "",
    follow_up_notes: "",
    total_price: "",
    session_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    payment_status: "paid",
    record_payment: true,
  });

  const { data: preloadedPatient } = useQuery({
    queryKey: ["patient", initialPatientUuid],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${initialPatientUuid}`, {
        params: { include: "summary" },
      });
      return res.data.data;
    },
    enabled: !!initialPatientUuid && mode === "existing",
  });

  useEffect(() => {
    if (preloadedPatient && !selectedPatient) {
      setSelectedPatient(preloadedPatient);
      setForm((f) => ({
        ...f,
        skin_type: preloadedPatient.skin_type ?? f.skin_type,
        allergies: preloadedPatient.allergies ?? "",
        medical_history: preloadedPatient.medical_history ?? "",
        notes: preloadedPatient.notes ?? "",
      }));
    }
  }, [preloadedPatient, selectedPatient]);

  useEffect(() => {
    if (selectedPatient && mode === "existing") {
      setForm((f) => ({
        ...f,
        skin_type: selectedPatient.skin_type ?? f.skin_type,
        allergies: selectedPatient.allergies ?? "",
        medical_history: selectedPatient.medical_history ?? "",
        notes: selectedPatient.notes ?? "",
      }));
    }
  }, [selectedPatient, mode]);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "existing" && !selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (mode === "new" && (!form.full_name.trim() || !form.phone.trim())) {
      toast.error("Patient name and phone are required");
      return;
    }
    if (!form.treatment_name.trim()) {
      toast.error("Treatment name is required");
      return;
    }
    if (!form.total_price || Number(form.total_price) < 0) {
      toast.error("Enter the total treatment cost");
      return;
    }

    setLoading(true);
    const body = new FormData();
    body.append("intake_mode", mode);

    if (mode === "existing" && selectedPatient) {
      body.append("patient_uuid", selectedPatient.uuid);
      const updateFields = ["skin_type", "allergies", "medical_history", "notes"] as const;
      updateFields.forEach((key) => {
        const v = form[key];
        if (typeof v === "string" && v !== "") body.append(key, v);
      });
    } else {
      const newPatientFields = [
        "full_name", "phone", "gender", "dob", "address", "skin_type",
        "allergies", "medical_history", "notes",
      ] as const;
      newPatientFields.forEach((key) => {
        const v = form[key];
        if (typeof v === "string" && v !== "") body.append(key, v);
      });
    }

    const treatmentFields = [
      "treatment_name", "diagnosis", "session_notes", "follow_up_notes",
      "total_price", "session_date", "payment_method", "payment_status",
    ] as const;
    treatmentFields.forEach((key) => {
      const v = form[key];
      if (typeof v === "string" && v !== "") body.append(key, v);
    });
    body.append("record_payment", form.record_payment ? "1" : "0");

    beforeImages.forEach((f) => body.append("before_images[]", f));
    afterImages.forEach((f) => body.append("after_images[]", f));
    progressImages.forEach((f) => body.append("progress_images[]", f));
    documents.forEach((f) => body.append("documents[]", f));

    try {
      const res = await api.post("/intake", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message ?? "Saved successfully");
      router.push(`/patients/${res.data.data.patient.uuid}`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const firstError = ax.response?.data?.errors
        ? Object.values(ax.response.data.errors)[0]?.[0]
        : null;
      toast.error(firstError ?? ax.response?.data?.message ?? "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patient Intake</h1>
        <p className="text-slate-500">
          One form for new patients or adding a treatment to someone already in your clinic.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 rounded-2xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setMode("new");
            setSelectedPatient(null);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            mode === "new"
              ? "bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <UserPlus className="h-4 w-4" />
          New patient
        </button>
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            mode === "existing"
              ? "bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <User className="h-4 w-4" />
          Existing patient
        </button>
      </div>

      {/* Patient section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            {mode === "new" ? "New Patient Information" : "Select Patient"}
          </CardTitle>
          <CardDescription>
            {mode === "new"
              ? "Demographics & skin profile"
              : "Search and select — you can update skin notes below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "existing" ? (
            <div className="space-y-6">
              <PatientSearchSelect
                selected={selectedPatient}
                onSelect={setSelectedPatient}
              />
              {selectedPatient && (
                <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <p className="sm:col-span-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Update skin profile (optional)
                  </p>
                  <div>
                    <label className="text-sm font-medium">Skin type</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.skin_type}
                      onChange={(e) => set("skin_type", e.target.value)}
                    >
                      {SKIN_TYPES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Allergies</label>
                    <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Medical history</label>
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.medical_history}
                      onChange={(e) => set("medical_history", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">General notes</label>
                    <textarea
                      className="mt-1 min-h-[60px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Full name *</label>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Phone *</label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Date of birth</label>
                <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Skin type *</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={form.skin_type}
                  onChange={(e) => set("skin_type", e.target.value)}
                >
                  {SKIN_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Allergies</label>
                <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="None / list allergies" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Medical history</label>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={form.medical_history}
                  onChange={(e) => set("medical_history", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">General notes</label>
                <textarea
                  className="mt-1 min-h-[60px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment — shared */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-violet-600" />
            Treatment Session
          </CardTitle>
          <CardDescription>Diagnosis, notes & session date</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Treatment name *</label>
            <Input
              placeholder="e.g. HydraFacial Deluxe, Chemical Peel, Laser"
              value={form.treatment_name}
              onChange={(e) => set("treatment_name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Session date *</label>
            <Input type="date" value={form.session_date} onChange={(e) => set("session_date", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Diagnosis / skin concern</label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="e.g. Acne, hyperpigmentation, dehydration..."
              value={form.diagnosis}
              onChange={(e) => set("diagnosis", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Session notes</label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={form.session_notes}
              onChange={(e) => set("session_notes", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Follow-up notes</label>
            <textarea
              className="mt-1 min-h-[60px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={form.follow_up_notes}
              onChange={(e) => set("follow_up_notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-transparent dark:border-violet-900/40 dark:from-violet-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-violet-600" />
            Treatment Cost
          </CardTitle>
          <CardDescription>Total price for this session</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Total cost (USD) *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.total_price}
              onChange={(e) => set("total_price", e.target.value)}
              required
            />
            {form.total_price && (
              <p className="mt-1 text-xs text-violet-600">{formatCurrency(Number(form.total_price))}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Payment method</label>
            <select
              className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={form.payment_method}
              onChange={(e) => set("payment_method", e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Payment status</label>
            <select
              className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={form.payment_status}
              onChange={(e) => set("payment_status", e.target.value)}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={form.record_payment}
              onChange={(e) => set("record_payment", e.target.checked)}
              className="rounded border-slate-300"
            />
            Record payment linked to this treatment
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-violet-600" />
            Before / After Photos
          </CardTitle>
          <CardDescription>Upload comparison images for this session (optional)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <FileDropZone label="Before photos" description="Skin before treatment" files={beforeImages} onChange={setBeforeImages} variant="image" />
          <FileDropZone label="After photos" description="Results after treatment" files={afterImages} onChange={setAfterImages} variant="image" />
          <div className="md:col-span-2">
            <FileDropZone label="Progress photos" description="Mid-treatment (optional)" files={progressImages} onChange={setProgressImages} variant="image" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Documents & Attachments
          </CardTitle>
          <CardDescription>Lab reports, consent forms, PDFs (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropZone label="Upload files" description="PDF, images — max 20MB each" files={documents} onChange={setDocuments} variant="document" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={loading} className="min-w-[220px]">
          <Sparkles className="h-4 w-4" />
          {loading
            ? "Saving..."
            : mode === "new"
              ? "Create patient & treatment"
              : "Add treatment to patient"}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
