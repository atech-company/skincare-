"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceItem, Patient, PaginatedMeta } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { selectClass, labelClass } from "@/lib/form-styles";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import { ExportPrintMenu, invoiceExportItems } from "@/components/shared/export-print-menu";

const InvoiceForm = dynamic(
  () => import("@/components/features/invoices/invoice-form").then((m) => m.InvoiceForm),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading form…</p> }
);

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "default"> = {
  paid: "success",
  partial: "warning",
  issued: "default",
  draft: "muted",
  cancelled: "muted",
};

export default function InvoicesPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", search, status, dateFrom, dateTo, page],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get<{ data: Invoice[]; meta: PaginatedMeta }>("/invoices", {
        params: {
          search: search || undefined,
          status: status || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          per_page: 20,
        },
      });
      return { ...res.data, data: unwrapList<Invoice>(res.data) };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: {
      patient: Patient;
      items: InvoiceItem[];
      discount_type: string;
      discount_value: number;
      notes?: string;
      treatment_session_uuid?: string;
    }) => {
      const { patient, ...rest } = values;
      await api.post("/invoices", {
        patient_uuid: patient.uuid,
        ...rest,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-balances"] });
      toast.success("Invoice created");
      setModalOpen(false);
      setSelectedPatient(null);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: {
      uuid: string;
      items: InvoiceItem[];
      discount_type: string;
      discount_value: number;
      notes?: string;
      treatment_session_uuid?: string;
    }) => {
      const { uuid, ...rest } = values;
      await api.put(`/invoices/${uuid}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice updated");
      setEditing(null);
    },
    onError: () => toast.error("Failed to update invoice"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (uuid: string) => {
      await api.post(`/invoices/${uuid}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice cancelled");
    },
    onError: () => toast.error("Failed to cancel invoice"),
  });

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  const outstanding = useMemo(
    () => invoices.filter((i) => i.status !== "cancelled" && i.balance > 0).length,
    [invoices]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Invoices</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Line items, discounts, and balances — {outstanding} with outstanding balance on this page
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setSelectedPatient(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New invoice
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search invoice # or patient..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="issued">Issued</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Input
          type="date"
          className="w-full sm:w-auto"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          className="w-full sm:w-auto"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800">
                  <th className="p-4 font-medium">Invoice</th>
                  <th className="p-4 font-medium">Patient</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Balance</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      key={invoice.uuid}
                      className="border-b border-slate-50 dark:border-slate-800/50"
                    >
                      <td className="p-4 font-medium">{invoice.invoice_number}</td>
                      <td className="p-4">{invoice.patient_name}</td>
                      <td className="p-4 text-slate-500">
                        {invoice.issued_at ? formatDate(invoice.issued_at) : "—"}
                      </td>
                      <td className="p-4">{formatCurrency(Number(invoice.total))}</td>
                      <td className="p-4">{formatCurrency(Number(invoice.balance))}</td>
                      <td className="p-4">
                        <Badge variant={STATUS_VARIANT[invoice.status] ?? "muted"}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <ExportPrintMenu items={invoiceExportItems(invoice.uuid)} label="PDF" />
                          {invoice.status !== "cancelled" && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await api.get<{ data: Invoice }>(
                                      `/invoices/${invoice.uuid}`
                                    );
                                    setEditing(res.data.data);
                                  } catch {
                                    toast.error("Failed to load invoice");
                                  }
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Cancel ${invoice.invoice_number}?`)) {
                                    cancelMutation.mutate(invoice.uuid);
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {meta && meta.last_page > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-slate-500">
                Page {page} of {meta.last_page}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen || !!editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setSelectedPatient(null);
        }}
        title={editing ? `Edit ${editing.invoice_number}` : "New invoice"}
      >
        <div className="space-y-4">
          {!editing && (
            <div>
              <label className={labelClass}>Patient</label>
              <PatientSearchSelect selected={selectedPatient} onSelect={setSelectedPatient} />
            </div>
          )}
          {(editing || selectedPatient) && (
            <InvoiceForm
              patientUuid={editing?.patient_uuid ?? selectedPatient?.uuid}
              initial={editing ?? undefined}
              loading={createMutation.isPending || updateMutation.isPending}
              onSubmit={async (values) => {
                if (editing) {
                  await updateMutation.mutateAsync({ uuid: editing.uuid, ...values });
                } else if (selectedPatient) {
                  await createMutation.mutateAsync({ patient: selectedPatient, ...values });
                }
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
