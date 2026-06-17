"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { TreatmentSession, TreatmentImage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CrudActions } from "@/components/shared/crud-actions";
import { ExportPrintMenu, treatmentExportItems } from "@/components/shared/export-print-menu";
import { TreatmentForm } from "@/components/features/treatments/treatment-form";
import { TreatmentProductSales } from "@/components/features/treatments/treatment-product-sales";
import { PaymentForm } from "@/components/features/payments/payment-form";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";

const BeforeAfterViewer = dynamic(
  () => import("@/components/features/images/before-after-viewer").then((m) => m.BeforeAfterViewer),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-2xl" /> }
);
const ImageUploadZone = dynamic(
  () => import("@/components/features/images/image-upload-zone").then((m) => m.ImageUploadZone),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full rounded-xl" /> }
);
const ImageAnnotator = dynamic(
  () => import("@/components/features/images/image-annotator").then((m) => m.ImageAnnotator),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-2xl" /> }
);

export default function TreatmentDetailPage() {
  const { canFetch } = useAuth();
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: session, refetch } = useQuery({
    queryKey: ["treatment", uuid],
    enabled: canFetch && !!uuid,
    queryFn: async () => {
      const res = await api.get<{ data: TreatmentSession }>(`/treatment-sessions/${uuid}`);
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: Parameters<NonNullable<Parameters<typeof TreatmentForm>[0]["onSubmit"]>>[0]) => {
      await api.put(`/treatment-sessions/${uuid}`, {
        treatment_name: values.treatment_name,
        diagnosis: values.diagnosis || null,
        session_notes: values.session_notes || null,
        follow_up_notes: values.follow_up_notes || null,
        total_price: values.total_price,
        session_date: values.session_date,
        status: values.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment", uuid] });
      toast.success("Session updated");
      setEditOpen(false);
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteImage = async (img: TreatmentImage) => {
    if (!(await confirmDelete("Delete this image?"))) return;
    if (await deleteResource(`/treatment-images/${img.id}`)) refetch();
  };

  const deleteSession = async () => {
    if (!(await confirmDelete("Delete this treatment session?"))) return;
    if (await deleteResource(`/treatment-sessions/${uuid}`)) {
      router.push("/treatments");
    }
  };

  const images = session?.images ?? [];
  const before = images.find((i) => i.type === "before");
  const after = images.find((i) => i.type === "after");
  const patientUuid = session?.patient?.uuid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session?.treatment_name ?? "Treatment"}</h1>
          <p className="text-slate-500 dark:text-slate-400">{session?.diagnosis}</p>
          {session?.accounting && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <Badge variant="muted">
                Charged: {formatCurrency(session.accounting.total_amount)}
              </Badge>
              <Badge variant="success">Paid: {formatCurrency(session.accounting.paid_amount)}</Badge>
              <Badge variant={session.accounting.balance > 0 ? "warning" : "success"}>
                {session.accounting.balance > 0
                  ? `Owed: ${formatCurrency(session.accounting.balance)}`
                  : "Paid in full"}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPrintMenu items={treatmentExportItems(uuid)} label="Export / Print" />
          {patientUuid && (
            <Button variant="secondary" size="sm" onClick={() => setPaymentOpen(true)}>
              Record payment
            </Button>
          )}
          <CrudActions onEdit={() => setEditOpen(true)} onDelete={deleteSession} deleteLabel="Delete session" />
        </div>
      </div>

      {session && (
        <TreatmentProductSales
          sessionUuid={uuid}
          sales={session.product_sales}
          onChanged={() => refetch()}
        />
      )}

      <Card>
        <CardHeader><CardTitle>Before / after</CardTitle></CardHeader>
        <CardContent>
          <BeforeAfterViewer before={before} after={after} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(["before", "after", "progress"] as const).map((type) => (
          <Card key={type}>
            <CardHeader><CardTitle className="text-base capitalize">{type} images</CardTitle></CardHeader>
            <CardContent>
              <ImageUploadZone sessionUuid={uuid} type={type} onUploaded={refetch} />
            </CardContent>
          </Card>
        ))}
      </div>

      {images.length > 0 && (
        <Card>
          <CardHeader><CardTitle>All images</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.uuid} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="capitalize">{img.type}</span>
                <button type="button" className="text-red-600 hover:underline" onClick={() => deleteImage(img)}>
                  Delete
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {before && (
        <Card>
          <CardHeader><CardTitle>Annotate image</CardTitle></CardHeader>
          <CardContent>
            <ImageAnnotator image={before} onSave={refetch} />
          </CardContent>
        </Card>
      )}

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record payment for this treatment">
        {patientUuid && (
          <PaymentForm
            patientUuid={patientUuid}
            defaultTreatmentSessionUuid={uuid}
            suggestedAmount={session?.accounting?.balance}
            onSubmit={async (v) => {
              const { treatment_session_uuid, ...rest } = v;
              await api.post("/payments", {
                patient_uuid: patientUuid,
                treatment_session_uuid: treatment_session_uuid || uuid,
                ...rest,
              });
              toast.success("Payment recorded");
              setPaymentOpen(false);
              refetch();
              queryClient.invalidateQueries({ queryKey: ["accounting-balances"] });
              queryClient.invalidateQueries({ queryKey: ["payments"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        )}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit session">
        {session && (
          <TreatmentForm
            initial={session}
            loading={updateMutation.isPending}
            onSubmit={(v) => updateMutation.mutateAsync(v)}
          />
        )}
      </Modal>
    </div>
  );
}
