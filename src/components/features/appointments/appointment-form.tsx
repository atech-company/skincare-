"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import { useFormFields } from "@/hooks/use-form-fields";
import { buildFormPayload, initFormState } from "@/lib/form-field-utils";
import type { Appointment, Patient } from "@/types";

export type AppointmentFormValues = {
  patient: Patient | null;
  payload: Record<string, unknown>;
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
  const { data: fields } = useFormFields("appointment");
  const [patient, setPatient] = useState<Patient | null>(initial?.patient ?? null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!fields?.length) return;
    const state = initFormState(fields, initial as Record<string, unknown> | undefined);
    if (initial?.appointment_time) {
      state.values.appointment_time = initial.appointment_time.slice(0, 5);
    } else if (!state.values.appointment_time) {
      state.values.appointment_time = "09:00";
    }
    setValues(state.values);
    setCustomFields(state.customFields);
  }, [fields, initial]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!initial && !patient) return;
        if (!fields?.length) return;
        await onSubmit({
          patient: patient ?? initial?.patient ?? null,
          payload: buildFormPayload(fields, values, customFields),
        });
      }}
      className="space-y-4"
    >
      {!initial && <PatientSearchSelect selected={patient} onSelect={setPatient} />}
      {initial?.patient && (
        <p className="text-sm text-slate-500">
          Patient: <strong>{initial.patient.full_name}</strong>
        </p>
      )}
      <DynamicFormFields
        entityType="appointment"
        values={values}
        customFields={customFields}
        onValuesChange={setValues}
        onCustomFieldsChange={setCustomFields}
      />
      <Button type="submit" disabled={loading || !fields?.length || (!initial && !patient)} className="w-full">
        {loading ? "Saving..." : initial ? "Update appointment" : "Book appointment"}
      </Button>
    </form>
  );
}
