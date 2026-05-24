"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { Appointment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import {
  AppointmentForm,
  type AppointmentFormValues,
} from "@/components/features/appointments/appointment-form";
import { formatDate } from "@/lib/utils";

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get<{ data: Appointment[] }>("/appointments");
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      values,
      appointmentId,
    }: {
      values: AppointmentFormValues;
      appointmentId?: number;
    }) => {
      const body = {
        appointment_date: values.appointment_date,
        appointment_time: values.appointment_time,
        status: values.status,
        notes: values.notes || null,
        ...(values.patient ? { patient_uuid: values.patient.uuid } : {}),
      };
      if (appointmentId) {
        const { patient_uuid: _, ...update } = body;
        await api.put(`/appointments/${appointmentId}`, update);
      } else {
        await api.post("/appointments", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(modal === "edit" ? "Appointment updated" : "Appointment booked");
      setModal(null);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save appointment"),
  });

  const handleDelete = async (a: Appointment) => {
    if (!(await confirmDelete(`Delete appointment for ${a.patient?.full_name}?`))) return;
    if (await deleteResource(`/appointments/${a.id}`)) {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-slate-500">Book, reschedule, or cancel visits</p>
        </div>
        <Button onClick={() => { setEditing(null); setModal("create"); }}>
          <Plus className="h-4 w-4" /> New appointment
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-slate-500">Loading...</p>}
        {data?.map((a) => (
          <Card key={a.uuid}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{a.patient?.full_name ?? "Patient"}</p>
                <p className="text-sm text-slate-500">
                  {formatDate(a.appointment_date)} at {a.appointment_time}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{a.status}</Badge>
                <CrudActions
                  onEdit={() => { setEditing(a); setModal("edit"); }}
                  onDelete={() => handleDelete(a)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !data?.length && (
          <p className="text-slate-500">No appointments yet. Click New appointment to book one.</p>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => { setModal(null); setEditing(null); }}
        title={modal === "edit" ? "Edit appointment" : "Book appointment"}
      >
        <AppointmentForm
          initial={editing ?? undefined}
          loading={saveMutation.isPending}
          onSubmit={(values) =>
            saveMutation.mutateAsync({ values, appointmentId: editing?.id })
          }
        />
      </Modal>
    </div>
  );
}
