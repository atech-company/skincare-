"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass, textareaClass } from "@/lib/form-styles";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import type { Appointment, Patient } from "@/types";

export type AppointmentFormValues = {
  patient: Patient | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
};

export function AppointmentForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Appointment;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
  loading?: boolean;
}) {
  const [patient, setPatient] = useState<Patient | null>(initial?.patient ?? null);
  const [date, setDate] = useState(initial?.appointment_date?.slice(0, 10) ?? "");
  const [time, setTime] = useState(initial?.appointment_time?.slice(0, 5) ?? "09:00");
  const [status, setStatus] = useState(initial?.status ?? "scheduled");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!initial && !patient) return;
        await onSubmit({
          patient: patient ?? initial?.patient ?? null,
          appointment_date: date,
          appointment_time: time,
          status,
          notes,
        });
      }}
      className="space-y-4"
    >
      {!initial && (
        <PatientSearchSelect selected={patient} onSelect={setPatient} />
      )}
      {initial?.patient && (
        <p className="text-sm text-slate-500">Patient: <strong>{initial.patient.full_name}</strong></p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Date *</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Time *</label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["scheduled", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading || (!initial && !patient)} className="w-full">
        {loading ? "Saving..." : initial ? "Update appointment" : "Book appointment"}
      </Button>
    </form>
  );
}
