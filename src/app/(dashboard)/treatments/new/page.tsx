"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <h1 className="text-2xl font-bold">New treatment session</h1>
      <Card>
        <CardHeader><CardTitle>Session details</CardTitle></CardHeader>
        <CardContent>
          <TreatmentForm
            showPatientPicker={!prefillPatient}
            defaultPatientUuid={prefillPatient ?? undefined}
            loading={loading}
            onSubmit={async (values) => {
              setLoading(true);
              try {
                const res = await api.post("/treatment-sessions", {
                  patient_uuid: prefillPatient ?? values.patient_uuid,
                  treatment_name: values.treatment_name,
                  diagnosis: values.diagnosis || null,
                  session_notes: values.session_notes || null,
                  total_price: values.total_price,
                  session_date: values.session_date,
                });
                toast.success("Session created");
                router.push(`/treatments/${res.data.data.uuid}`);
              } catch {
                toast.error("Failed to create session");
              } finally {
                setLoading(false);
              }
            }}
          />
        </CardContent>
      </Card>
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
