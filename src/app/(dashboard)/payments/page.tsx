"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PatientBalance, Payment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { selectClass, labelClass } from "@/lib/form-styles";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import type { Patient } from "@/types";
import { ExportPrintMenu, paymentInvoiceItems } from "@/components/shared/export-print-menu";

const PaymentForm = dynamic(
  () => import("@/components/features/payments/payment-form").then((m) => m.PaymentForm),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading form…</p> }
);

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "default"> = {
  paid: "success",
  partial: "warning",
  unpaid: "warning",
  pending: "warning",
};

export default function PaymentsPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: balances } = useQuery({
    queryKey: ["accounting-balances", search, status],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get<{ data: PatientBalance[]; meta: { total_outstanding: number } }>(
        "/accounting/balances",
        { params: { search: search || undefined, status: status || undefined } }
      );
      return res.data;
    },
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", search, status, dateFrom, dateTo],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get("/payments", {
        params: {
          search: search || undefined,
          status: status || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          per_page: 50,
        },
      });
      return unwrapList<Payment>(res.data);
    },
  });

  const recordMutation = useMutation({
    mutationFn: async (values: {
      patient: Patient;
      treatment_session_uuid?: string;
      invoice_uuid?: string;
      [key: string]: unknown;
    }) => {
      const { patient, treatment_session_uuid, invoice_uuid, ...rest } = values;
      await api.post("/payments", {
        patient_uuid: patient.uuid,
        treatment_session_uuid: treatment_session_uuid || null,
        invoice_uuid: invoice_uuid || null,
        ...rest,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-balances"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Payment recorded");
      setModalOpen(false);
      setSelectedPatient(null);
    },
    onError: () => toast.error("Failed to record payment"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Payments & Accounting</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track payments, balances, and outstanding amounts per patient
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPrintMenu
            items={[
              {
                type: "report",
                report: "payments",
                format: "pdf",
                label: "Payments PDF (A4)",
                params: { search, status, date_from: dateFrom, date_to: dateTo },
              },
              {
                type: "report",
                report: "payments",
                format: "csv",
                label: "Payments Excel (CSV)",
                params: { search, status, date_from: dateFrom, date_to: dateTo },
              },
              {
                type: "report",
                report: "balances",
                format: "pdf",
                label: "Balances PDF",
              },
              {
                type: "report",
                report: "balances",
                format: "csv",
                label: "Balances Excel (CSV)",
              },
            ]}
            label="Export / Print"
          />
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total outstanding</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(balances?.meta?.total_outstanding ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Patients with balance</p>
            <p className="text-2xl font-bold">{balances?.data?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!balances?.data?.length && (
            <p className="text-sm text-slate-500">No outstanding balances.</p>
          )}
          {balances?.data?.map((b) => (
            <div
              key={b.patient_uuid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700"
            >
              <Link href={`/patients/${b.patient_uuid}?tab=payments`} className="font-medium hover:text-violet-600">
                {b.patient_name}
              </Link>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500">Charged: {formatCurrency(b.total_amount)}</span>
                <span className="text-emerald-600">Paid: {formatCurrency(b.paid_amount)}</span>
                <span className="font-semibold text-amber-600">Balance: {formatCurrency(b.balance)}</span>
                <Badge variant={STATUS_VARIANT[b.status] ?? "muted"}>{b.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-slate-500">Loading...</p>}
          <div className="space-y-2">
            {payments?.map((p) => (
              <div
                key={p.uuid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700"
              >
                <div>
                  <p className="font-medium">{p.patient_name ?? "Patient"}</p>
                  <p className="text-xs text-slate-500">
                    {p.paid_at ? formatDate(p.paid_at) : "—"} · {p.payment_method}
                    {p.invoice_number && ` · ${p.invoice_number}`}
                    {p.treatment_name && ` · ${p.treatment_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "muted"}>{p.status}</Badge>
                  {p.patient_uuid && (
                    <ExportPrintMenu
                      items={paymentInvoiceItems(p.patient_uuid, p.uuid)}
                      label="Receipt"
                      size="sm"
                      variant="ghost"
                    />
                  )}
                </div>
              </div>
            ))}
            {!isLoading && !payments?.length && (
              <p className="text-sm text-slate-500">No payments match your filters.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record payment">
        <div className="space-y-4">
          <PatientSearchSelect selected={selectedPatient} onSelect={setSelectedPatient} />
          {selectedPatient && (
            <PaymentForm
              patientUuid={selectedPatient.uuid}
              loading={recordMutation.isPending}
              onSubmit={async (v) => {
                if (!selectedPatient) return;
                await recordMutation.mutateAsync({ ...v, patient: selectedPatient });
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
