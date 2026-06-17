"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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

const BLOCKING_STATUSES = new Set(["scheduled", "confirmed", "completed", "no_show"]);

function findAppointmentConflict(
  appointments: Appointment[],
  date: string,
  time: string,
  excludeId?: number,
): Appointment | undefined {
  if (!date || !time) return undefined;
  const timeKey = time.slice(0, 5);
  return appointments.find(
    (a) =>
      a.id !== excludeId &&
      a.appointment_date === date &&
      BLOCKING_STATUSES.has(a.status) &&
      a.appointment_time.slice(0, 5) === timeKey,
  );
}

export function AppointmentForm({
  initial,
  existingAppointments = [],
  onSubmit,
  loading,
}: {
  initial?: Appointment;
  /** Used to warn when another appointment shares the same date & time */
  existingAppointments?: Appointment[];
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

  const conflict = useMemo(
    () =>
      findAppointmentConflict(
        existingAppointments,
        values.appointment_date ?? "",
        values.appointment_time ?? "",
        initial?.id,
      ),
    [existingAppointments, values.appointment_date, values.appointment_time, initial?.id],
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!initial && !patient) return;
        if (!fields?.length) return;
        if (conflict) {
          toast.error(
            `Another appointment is already booked at ${values.appointment_time?.slice(0, 5)} (${conflict.patient?.full_name ?? "another patient"}).`,
          );
          return;
        }
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
      {conflict && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Another appointment is already booked at{" "}
            <strong>{values.appointment_time?.slice(0, 5)}</strong> on this date
            {conflict.patient?.full_name ? (
              <> for <strong>{conflict.patient.full_name}</strong></>
            ) : null}
            .
          </span>
        </div>
      )}
      <Button type="submit" disabled={loading || !fields?.length || (!initial && !patient) || !!conflict} className="w-full">
        {loading ? "Saving..." : initial ? "Update appointment" : "Book appointment"}
      </Button>
    </form>
  );
}
