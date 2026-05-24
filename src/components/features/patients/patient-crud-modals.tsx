"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { Patient } from "@/types";
import { Modal } from "@/components/ui/modal";
import { PatientForm, type PatientFormData } from "@/components/features/patients/patient-form";

function invalidatePatients(queryClient: ReturnType<typeof useQueryClient>, uuid?: string) {
  queryClient.invalidateQueries({ queryKey: ["patients"] });
  if (uuid) {
    queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
  }
}

export function PatientCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (patient: Patient) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title="New patient" description="Add patient details only. Use Intake for treatment + files.">
      <PatientForm
        loading={loading}
        onSubmit={async (data: PatientFormData) => {
          setLoading(true);
          try {
            const res = await api.post<{ data: Patient; message: string }>("/patients", data);
            invalidatePatients(queryClient, res.data.data.uuid);
            toast.success("Patient created");
            onClose();
            onCreated?.(res.data.data);
            router.push(`/patients/${res.data.data.uuid}`);
          } catch {
            toast.error("Failed to create patient");
          } finally {
            setLoading(false);
          }
        }}
      />
    </Modal>
  );
}

export function PatientEditModal({
  patient,
  open,
  onClose,
}: {
  patient: Patient;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title="Edit patient">
      <PatientForm
        defaultValues={patient}
        loading={loading}
        onSubmit={async (data: PatientFormData) => {
          setLoading(true);
          try {
            await api.put(`/patients/${patient.uuid}`, data);
            invalidatePatients(queryClient, patient.uuid);
            toast.success("Patient updated");
            onClose();
          } catch {
            toast.error("Update failed");
          } finally {
            setLoading(false);
          }
        }}
      />
    </Modal>
  );
}

export async function deletePatient(
  patient: Patient,
  queryClient: ReturnType<typeof useQueryClient>,
  onDeleted?: () => void
): Promise<boolean> {
  if (!(await confirmDelete(`Delete "${patient.full_name}"? This cannot be undone.`))) {
    return false;
  }
  const ok = await deleteResource(`/patients/${patient.uuid}`, {
    successMessage: "Patient deleted",
  });
  if (ok) {
    invalidatePatients(queryClient, patient.uuid);
    onDeleted?.();
  }
  return ok;
}
