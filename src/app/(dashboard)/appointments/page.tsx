"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api, extractApiError } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { Appointment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import { selectClass, labelClass } from "@/lib/form-styles";
import {
  AppointmentForm,
  type AppointmentFormValues,
} from "@/components/features/appointments/appointment-form";
import { formatDate } from "@/lib/utils";
import { ExportPrintMenu } from "@/components/shared/export-print-menu";

function isPastAppointment(a: Appointment): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return a.appointment_date < today;
}

export default function AppointmentsPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", search, dateFrom, dateTo, status],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get("/appointments", {
        params: {
          search: search || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          status: status || undefined,
          per_page: 100,
        },
      });
      return unwrapList<Appointment>(res.data);
    },
    staleTime: 60 * 1000,
  });

  const upcoming = data?.filter((a) => !isPastAppointment(a)) ?? [];
  const past = data?.filter((a) => isPastAppointment(a)) ?? [];

  const saveMutation = useMutation({
    mutationFn: async ({
      values,
      appointmentId,
    }: {
      values: AppointmentFormValues;
      appointmentId?: number;
    }) => {
      const body = {
        ...values.payload,
        ...(values.patient ? { patient_uuid: values.patient.uuid } : {}),
      };
      if (appointmentId) {
        const { patient_uuid: _patientUuid, ...update } = body;
        void _patientUuid;
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
    onError: (err) => toast.error(extractApiError(err, "Failed to save appointment")),
  });

  const handleDelete = async (a: Appointment) => {
    if (!(await confirmDelete(`Delete appointment for ${a.patient?.full_name}?`))) return;
    if (await deleteResource(`/appointments/${a.id}`)) {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }
  };

  const renderList = (items: Appointment[]) =>
    items.map((a) => (
      <Card key={a.uuid}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{a.patient?.full_name ?? "Patient"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
    ));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upcoming first, past appointments at the bottom
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPrintMenu
            items={[
              {
                type: "report",
                report: "appointments",
                format: "pdf",
                label: "PDF (A4)",
                params: { date_from: dateFrom, date_to: dateTo, status },
              },
              {
                type: "report",
                report: "appointments",
                format: "csv",
                label: "Excel (CSV)",
                params: { date_from: dateFrom, date_to: dateTo, status },
              },
            ]}
            label="Export schedule"
          />
          <Button onClick={() => { setEditing(null); setModal("create"); }}>
            <Plus className="h-4 w-4" /> New appointment
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}

      {!isLoading && (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length ? renderList(upcoming) : (
              <p className="text-sm text-slate-500">No upcoming appointments.</p>
            )}
          </div>

          {past.length > 0 && (
            <div className="space-y-3 border-t pt-6 dark:border-slate-800">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Past ({past.length})
              </h2>
              {renderList(past)}
            </div>
          )}
        </>
      )}

      <Modal
        open={modal !== null}
        onClose={() => { setModal(null); setEditing(null); }}
        title={modal === "edit" ? "Edit appointment" : "Book appointment"}
      >
        <AppointmentForm
          initial={editing ?? undefined}
          existingAppointments={data ?? []}
          loading={saveMutation.isPending}
          onSubmit={(values) =>
            saveMutation.mutateAsync({ values, appointmentId: editing?.id })
          }
        />
      </Modal>
    </div>
  );
}
