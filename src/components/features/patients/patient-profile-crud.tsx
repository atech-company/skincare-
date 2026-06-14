"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { confirmDelete, deleteResource } from "@/lib/crud";
import { deletePatient } from "@/components/features/patients/patient-crud-modals";
import { labelClass, selectClass } from "@/lib/form-styles";
import { ProductSearchSelect } from "@/components/features/products/product-search-select";
import type { Patient, PatientProduct, Payment, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import { ExportPrintMenu, paymentInvoiceItems } from "@/components/shared/export-print-menu";
import { useModuleAccess } from "@/hooks/use-module-access";
import { ModuleLockedOverlay } from "@/components/layout/module-locked-overlay";
import { PaymentForm } from "@/components/features/payments/payment-form";
import { DocumentForm } from "@/components/features/documents/document-form";
import { DocumentViewerPanel } from "@/components/features/documents/document-viewer-panel";
import { downloadDocument } from "@/lib/document-utils";
import { formatCurrency, formatDate } from "@/lib/utils";

export function SessionListCrud({
  uuid,
  sessions,
  loading,
}: {
  uuid: string;
  sessions: Patient["treatment_sessions"];
  loading?: boolean;
}) {
  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!sessions?.length) {
    return (
      <div className="space-y-2">
        <p className="text-slate-500">No sessions yet.</p>
        <Link href={`/treatments/new?patient=${uuid}`}>
          <Button size="sm">Add treatment</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card key={s.uuid}>
          <CardContent className="flex items-center justify-between p-4">
            <Link href={`/treatments/${s.uuid}`} className="flex-1 hover:text-violet-600">
              <p className="font-semibold">{s.treatment_name}</p>
              <p className="text-sm text-slate-500">{formatDate(s.session_date)}</p>
            </Link>
            <Badge variant="success">{formatCurrency(Number(s.total_price))}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PaymentsTab({ uuid, payments }: { uuid: string; payments?: Payment[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const { canInteract, locked } = useModuleAccess("payments");

  const { data: balance } = useQuery({
    queryKey: ["patient-balance", uuid],
    queryFn: async () => {
      const res = await api.get<{ data: import("@/types").PatientBalance }>(`/patients/${uuid}/balance`);
      return res.data.data;
    },
  });

  const save = async (values: Record<string, unknown> & { treatment_session_uuid?: string }) => {
    const body = {
      ...values,
      treatment_session_uuid: values.treatment_session_uuid || null,
    };
    if (editing) {
      await api.put(`/payments/${editing.id}`, body);
      toast.success("Payment updated");
    } else {
      await api.post("/payments", { patient_uuid: uuid, ...body });
      toast.success("Payment recorded");
    }
    queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
    queryClient.invalidateQueries({ queryKey: ["patient-balance", uuid] });
    queryClient.invalidateQueries({ queryKey: ["accounting-balances"] });
    setOpen(false);
    setEditing(null);
  };

  const body = (
    <div className="space-y-4">
      {balance && (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Total charged</p>
              <p className="font-semibold">{formatCurrency(balance.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="font-semibold text-emerald-600">{formatCurrency(balance.paid_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Still owed</p>
              <p
                className={
                  balance.balance > 0
                    ? "font-semibold text-amber-600"
                    : "font-semibold text-emerald-600"
                }
              >
                {balance.balance > 0 ? formatCurrency(balance.balance) : "Nothing owed"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <Badge variant={balance.status === "paid" ? "success" : "warning"}>
                {balance.status === "paid" ? "Paid in full" : balance.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        {canInteract && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        )}
        {canInteract && (
          <ExportPrintMenu
            items={[
              { type: "export", path: `exports/patients/${uuid}/statement`, label: "Statement PDF (A4)", paper: "a4" },
              { type: "export", path: `exports/patients/${uuid}/statement`, label: "Print statement", paper: "a4", print: true },
            ]}
            label="Export statement"
            size="sm"
          />
        )}
      </div>
      {!payments?.length && <p className="text-slate-500">No payments.</p>}
      {payments?.map((p) => (
        <Card key={p.uuid}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <span>{formatCurrency(Number(p.amount))} · {p.payment_method}</span>
              {p.treatment_name && (
                <p className="text-xs text-slate-500">{p.treatment_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === "paid" ? "success" : "warning"}>{p.status}</Badge>
              {canInteract && (
                <ExportPrintMenu
                  items={paymentInvoiceItems(uuid, p.uuid)}
                  label="Receipt"
                  size="sm"
                  variant="ghost"
                />
              )}
              {canInteract && (
                <CrudActions onEdit={() => { setEditing(p); setOpen(true); }} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit payment" : "Record payment"}>
        <PaymentForm patientUuid={uuid} initial={editing ?? undefined} onSubmit={save} />
      </Modal>
    </div>
  );

  if (locked) {
    return (
      <ModuleLockedOverlay title="Payments — locked">
        {body}
      </ModuleLockedOverlay>
    );
  }

  return body;
}

export function DocumentsTab({ uuid, patient, documents }: { uuid: string; patient: Patient; documents?: Patient["documents"] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NonNullable<Patient["documents"]>[number] | null>(null);

  const handleDownload = async (doc: NonNullable<Patient["documents"]>[number], e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadDocument(doc, patient.full_name);
      toast.success("Download started");
    } catch {
      toast.error("Could not download file");
    }
  };

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Upload</Button>
      {!documents?.length && <p className="text-slate-500 dark:text-slate-400">No documents.</p>}
      <div className={selected ? "grid gap-4 lg:grid-cols-2" : undefined}>
        <div className="space-y-2">
          {documents?.map((d) => (
            <Card
              key={d.uuid}
              className={selected?.uuid === d.uuid ? "border-violet-400 ring-2 ring-violet-500/20" : "cursor-pointer hover:border-violet-300 dark:hover:border-violet-700"}
              onClick={() => setSelected(d)}
            >
              <CardContent className="flex items-center justify-between gap-2 p-4">
                <p className="font-medium hover:text-violet-600 dark:hover:text-violet-300">{d.title}</p>
                <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    size="sm"
                    title={`Download — ${patient.full_name}`}
                    onClick={(e) => void handleDownload(d, e)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <CrudActions
                    onDelete={async () => {
                      if (!(await confirmDelete(`Delete "${d.title}"?`))) return;
                      if (await deleteResource(`/documents/${d.id}`)) {
                        queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
                        if (selected?.uuid === d.uuid) setSelected(null);
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {selected && (
          <DocumentViewerPanel
            doc={{ ...selected, patient_uuid: uuid, patient_name: patient.full_name }}
            patientName={patient.full_name}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload document">
        <DocumentForm
          defaultPatient={patient}
          onSubmit={async (v) => {
            const form = new FormData();
            form.append("patient_uuid", v.patient.uuid);
            form.append("file", v.file);
            Object.entries(v.payload).forEach(([key, val]) => {
              if (key === "custom_fields" && val && typeof val === "object") {
                Object.entries(val as Record<string, string>).forEach(([ck, cv]) => {
                  form.append(`custom_fields[${ck}]`, String(cv));
                });
              } else if (val != null && val !== "") {
                form.append(key, String(val));
              }
            });
            await api.post("/documents", form, { headers: { "Content-Type": "multipart/form-data" } });
            queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
            toast.success("Uploaded");
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

export function ProductsTab({ uuid, products }: { uuid: string; products?: PatientProduct[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [period, setPeriod] = useState("morning");
  const [assigning, setAssigning] = useState(false);

  const assignProduct = async (product: Product) => {
    setAssigning(true);
    try {
      await api.post(`/patients/${uuid}/products`, {
        product_uuid: product.uuid,
        routine_period: period,
      });
      queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
      toast.success(`${product.product_name} assigned (${period})`);
      setSelectedProduct(null);
      setOpen(false);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Could not assign product");
    } finally {
      setAssigning(false);
    }
  };

  const remove = async (pp: PatientProduct) => {
    if (!(await confirmDelete("Remove this product from routine?"))) return;
    if (await deleteResource(`/patients/${uuid}/products/${pp.id}`)) {
      queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
    }
  };

  const morning = products?.filter((p) => p.routine_period === "morning") ?? [];
  const night = products?.filter((p) => p.routine_period === "night") ?? [];

  const Routine = ({ title, items }: { title: string; items: PatientProduct[] }) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length ? items.map((pp) => (
          <div key={pp.id} className="flex items-center justify-between rounded-xl border p-3">
            <p className="font-medium">{pp.product?.product_name}</p>
            <button type="button" className="text-sm text-red-600" onClick={() => remove(pp)}>Remove</button>
          </div>
        )) : <p className="text-sm text-slate-500">None assigned</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Assign product</Button>
      <div className="grid gap-4 md:grid-cols-2">
        <Routine title="Morning" items={morning} />
        <Routine title="Night" items={night} />
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign product">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Routine</label>
            <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="morning">Morning</option>
              <option value="night">Night</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Search product</label>
            <p className="mb-2 text-xs text-slate-500">Pick a result to assign it immediately.</p>
            <ProductSearchSelect
              selected={selectedProduct}
              onSelect={(p) => {
                if (p) assignProduct(p);
                else setSelectedProduct(null);
              }}
            />
          </div>
          {assigning && <p className="text-sm text-slate-500">Assigning…</p>}
        </div>
      </Modal>
    </div>
  );
}

export function DeletePatientButton({ patient }: { patient: Patient }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        if (await deletePatient(patient, queryClient)) {
          router.push("/patients");
        }
      }}
    >
      Delete patient
    </Button>
  );
}
