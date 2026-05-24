"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

const PatientIntakeForm = dynamic(
  () => import("@/components/features/patients/patient-intake-form").then((m) => m.PatientIntakeForm),
  { ssr: false, loading: () => <Skeleton className="mx-auto h-96 max-w-4xl rounded-2xl" /> }
);

function NewPatientPageContent() {
  const params = useSearchParams();
  const patientUuid = params.get("patient") ?? undefined;

  return (
    <PatientIntakeForm
      initialMode={patientUuid ? "existing" : "new"}
      initialPatientUuid={patientUuid}
    />
  );
}

export default function NewPatientPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl rounded-2xl" />}>
      <NewPatientPageContent />
    </Suspense>
  );
}
