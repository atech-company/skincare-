"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import { useFormFields } from "@/hooks/use-form-fields";
import { buildFormPayload, initFormState } from "@/lib/form-field-utils";
import type { Patient } from "@/types";

export function DocumentForm({
  defaultPatient,
  onSubmit,
  loading,
}: {
  defaultPatient?: Patient | null;
  onSubmit: (values: { patient: Patient; file: File; payload: Record<string, unknown> }) => Promise<void>;
  loading?: boolean;
}) {
  const { data: fields } = useFormFields("document");
  const [patient, setPatient] = useState<Patient | null>(defaultPatient ?? null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!fields?.length) return;
    const state = initFormState(fields, null);
    state.values.category = state.values.category || "other";
    setValues(state.values);
    setCustomFields(state.customFields);
  }, [fields]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!patient || !file || !fields?.length) return;
        await onSubmit({
          patient,
          file,
          payload: buildFormPayload(fields, values, customFields),
        });
      }}
      className="space-y-4"
    >
      {!defaultPatient && <PatientSearchSelect selected={patient} onSelect={setPatient} />}
      {defaultPatient && (
        <p className="text-sm text-slate-500">
          Patient: <strong>{defaultPatient.full_name}</strong>
        </p>
      )}
      <DynamicFormFields
        entityType="document"
        values={values}
        customFields={customFields}
        onValuesChange={setValues}
        onCustomFieldsChange={setCustomFields}
      />
      <div>
        <label className="text-sm font-medium">File *</label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>
      <Button type="submit" disabled={loading || !patient || !file || !fields?.length} className="w-full">
        {loading ? "Uploading..." : "Upload document"}
      </Button>
    </form>
  );
}
