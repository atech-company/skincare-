"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientIntakeForm } from "@/components/features/patients/patient-intake-form";

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
