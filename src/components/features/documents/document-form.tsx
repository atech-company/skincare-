"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/lib/form-styles";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import type { Patient } from "@/types";

export function DocumentForm({
  defaultPatient,
  onSubmit,
  loading,
}: {
  defaultPatient?: Patient | null;
  onSubmit: (values: { patient: Patient; title: string; category: string; file: File }) => Promise<void>;
  loading?: boolean;
}) {
  const [patient, setPatient] = useState<Patient | null>(defaultPatient ?? null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [file, setFile] = useState<File | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!patient || !file) return;
        await onSubmit({ patient, title, category, file });
      }}
      className="space-y-4"
    >
      {!defaultPatient && <PatientSearchSelect selected={patient} onSelect={setPatient} />}
      {defaultPatient && (
        <p className="text-sm text-slate-500">Patient: <strong>{defaultPatient.full_name}</strong></p>
      )}
      <div>
        <label className="text-sm font-medium">Title *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium">Category</label>
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          {["lab_report", "consent", "prescription", "image", "other"].map((c) => (
            <option key={c} value={c}>{c.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">File *</label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>
      <Button type="submit" disabled={loading || !patient || !file} className="w-full">
        {loading ? "Uploading..." : "Upload document"}
      </Button>
    </form>
  );
}
