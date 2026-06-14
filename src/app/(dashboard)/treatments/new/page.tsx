"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { Skeleton } from "@/components/ui/skeleton";
import { TreatmentForm } from "@/components/features/treatments/treatment-form";
import { useState } from "react";

function NewTreatmentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillPatient = params.get("patient");
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New treatment session</h1>
        <p className="text-sm text-slate-500">
          Fill session details. Search products below session fields to add them instantly.
        </p>
      </div>
      <TreatmentForm
        showPatientPicker={!prefillPatient}
        defaultPatientUuid={prefillPatient ?? undefined}
        showProducts
        showCheckout
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            const res = await api.post("/treatment-sessions", {
              ...values,
              patient_uuid: prefillPatient ?? values.patient_uuid,
            });
            const count = (values.product_sales as unknown[])?.length ?? 0;
            toast.success(
              count > 0 ? `Session created with ${count} product(s)` : "Session created"
            );
            router.push(`/treatments/${res.data.data.uuid}`);
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to create session"));
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}

export default function NewTreatmentPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-xl w-full rounded-2xl" />}>
      <NewTreatmentForm />
    </Suspense>
  );
}
