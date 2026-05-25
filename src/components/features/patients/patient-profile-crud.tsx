"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { confirmDelete, deleteResource } from "@/lib/crud";
import { deletePatient } from "@/components/features/patients/patient-crud-modals";
import { selectClass } from "@/lib/form-styles";
import type { Patient, PatientProduct, Payment, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import { PatientEditModal } from "@/components/features/patients/patient-crud-modals";
import { PaymentForm } from "@/components/features/payments/payment-form";
import { DocumentForm } from "@/components/features/documents/document-form";
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

  const save = async (values: {
    amount: string;
    payment_method: string;
    status: string;
    reference: string;
    notes: string;
    paid_at: string;
  }) => {
    const body = {
      amount: parseFloat(values.amount),
      payment_method: values.payment_method,
      status: values.status,
      reference: values.reference || null,
      notes: values.notes || null,
      paid_at: values.paid_at || null,
    };
    if (editing) {
      await api.put(`/payments/${editing.id}`, body);
      toast.success("Payment updated");
    } else {
      await api.post("/payments", { patient_uuid: uuid, ...body });
      toast.success("Payment recorded");
    }
    queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
        <Plus className="h-4 w-4" /> Record payment
      </Button>
      {!payments?.length && <p className="text-slate-500">No payments.</p>}
      {payments?.map((p) => (
        <Card key={p.uuid}>
          <CardContent className="flex items-center justify-between p-4">
            <span>{formatCurrency(Number(p.amount))} · {p.payment_method}</span>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === "paid" ? "success" : "warning"}>{p.status}</Badge>
              <CrudActions onEdit={() => { setEditing(p); setOpen(true); }} />
            </div>
          </CardContent>
        </Card>
      ))}
      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit payment" : "Record payment"}>
        <PaymentForm initial={editing ?? undefined} onSubmit={save} />
      </Modal>
    </div>
  );
}

export function DocumentsTab({ uuid, patient, documents }: { uuid: string; patient: Patient; documents?: Patient["documents"] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Upload</Button>
      {!documents?.length && <p className="text-slate-500">No documents.</p>}
      {documents?.map((d) => (
        <Card key={d.uuid}>
          <CardContent className="flex items-center justify-between p-4">
            <a href={d.file_url} target="_blank" rel="noreferrer" className="font-medium hover:text-violet-600">
              {d.title}
            </a>
            <CrudActions
              onDelete={async () => {
                if (!(await confirmDelete(`Delete "${d.title}"?`))) return;
                if (await deleteResource(`/documents/${d.id}`)) {
                  queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
                }
              }}
            />
          </CardContent>
        </Card>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Upload document">
        <DocumentForm
          defaultPatient={patient}
          onSubmit={async (v) => {
            const form = new FormData();
            form.append("patient_uuid", v.patient.uuid);
            form.append("title", v.title);
            form.append("category", v.category);
            form.append("file", v.file);
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
  const [productUuid, setProductUuid] = useState("");
  const [period, setPeriod] = useState("morning");

  const { data: catalog } = useQuery({
    queryKey: ["products", "pick"],
    queryFn: async () => {
      const res = await api.get("/products", { params: { per_page: 100 } });
      return unwrapList<Product>(res.data);
    },
  });

  const assign = async () => {
    if (!productUuid) return;
    await api.post(`/patients/${uuid}/products`, {
      product_uuid: productUuid,
      routine_period: period,
    });
    queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
    toast.success("Product assigned");
    setOpen(false);
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
          <select className={selectClass} value={productUuid} onChange={(e) => setProductUuid(e.target.value)}>
            <option value="">Select product</option>
            {catalog?.map((p) => (
              <option key={p.uuid} value={p.uuid}>{p.product_name}</option>
            ))}
          </select>
          <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="morning">Morning</option>
            <option value="night">Night</option>
            <option value="other">Other</option>
          </select>
          <Button className="w-full" onClick={assign}>Assign</Button>
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
