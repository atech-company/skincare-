"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass, textareaClass } from "@/lib/form-styles";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import type { Patient, TreatmentSession } from "@/types";

export function TreatmentForm({
  initial,
  showPatientPicker,
  defaultPatientUuid,
  onSubmit,
  loading,
}: {
  initial?: TreatmentSession;
  showPatientPicker?: boolean;
  defaultPatientUuid?: string;
  onSubmit: (values: {
    patient_uuid: string;
    treatment_name: string;
    diagnosis: string;
    session_notes: string;
    follow_up_notes: string;
    total_price: number;
    session_date: string;
    status: string;
  }) => Promise<void>;
  loading?: boolean;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState({
    treatment_name: initial?.treatment_name ?? "",
    diagnosis: initial?.diagnosis ?? "",
    session_notes: initial?.session_notes ?? "",
    follow_up_notes: initial?.follow_up_notes ?? "",
    total_price: initial ? String(initial.total_price) : "",
    session_date: initial?.session_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    status: initial?.status ?? "scheduled",
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const patientUuid = patient?.uuid ?? defaultPatientUuid;
        if (showPatientPicker && !patientUuid) return;
        await onSubmit({
          patient_uuid: patientUuid ?? "",
          treatment_name: form.treatment_name,
          diagnosis: form.diagnosis,
          session_notes: form.session_notes,
          follow_up_notes: form.follow_up_notes,
          total_price: parseFloat(form.total_price) || 0,
          session_date: form.session_date,
          status: form.status,
        });
      }}
      className="space-y-4"
    >
      {showPatientPicker && <PatientSearchSelect selected={patient} onSelect={setPatient} />}
      <Input placeholder="Treatment name *" value={form.treatment_name} onChange={(e) => set("treatment_name", e.target.value)} required />
      <Input placeholder="Diagnosis" value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />
      <textarea className={textareaClass} placeholder="Session notes" value={form.session_notes} onChange={(e) => set("session_notes", e.target.value)} />
      {initial && (
        <textarea className={textareaClass} placeholder="Follow-up notes" value={form.follow_up_notes} onChange={(e) => set("follow_up_notes", e.target.value)} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="number" placeholder="Price" value={form.total_price} onChange={(e) => set("total_price", e.target.value)} />
        <Input type="date" value={form.session_date} onChange={(e) => set("session_date", e.target.value)} />
      </div>
      {initial && (
        <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {["scheduled", "in_progress", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
      <Button type="submit" disabled={loading || (showPatientPicker && !patient)} className="w-full">
        {loading ? "Saving..." : initial ? "Update session" : "Create session"}
      </Button>
    </form>
  );
}
