"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Camera,
  FileText,
  Sparkles,
  Stethoscope,
  User,
  UserPlus,
} from "lucide-react";
import { api, extractApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/features/patients/file-drop-zone";
import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";
import { SessionCheckoutSection } from "@/components/features/treatments/session-checkout-section";
import { useModuleAccess } from "@/hooks/use-module-access";
import { ModuleLockedOverlay } from "@/components/layout/module-locked-overlay";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { useFormFields } from "@/hooks/use-form-fields";
import { buildFormPayload, initFormState, validateFormFields } from "@/lib/form-field-utils";
import {
  OptionalTreatmentProducts,
  productLinesToPayload,
  type TreatmentProductLine,
} from "@/components/features/treatments/optional-treatment-products";
import type { Patient } from "@/types";

type IntakeMode = "new" | "existing";

export function PatientIntakeForm({
  initialMode = "new",
  initialPatientUuid,
}: {
  initialMode?: IntakeMode;
  initialPatientUuid?: string;
}) {
  const { canFetch } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<IntakeMode>(initialMode);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [progressImages, setProgressImages] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);

  const [payment, setPayment] = useState({
    treatment_fee: "",
    payment_method: "cash",
    payment_status: "paid",
    record_payment: true,
  });
  const [productSubtotal, setProductSubtotal] = useState(0);

  const { data: patientFields } = useFormFields("patient");
  const { data: treatmentFields } = useFormFields("treatment_session");
  const [patientValues, setPatientValues] = useState<Record<string, string>>({});
  const [patientCustom, setPatientCustom] = useState<Record<string, string>>({});
  const [treatmentValues, setTreatmentValues] = useState<Record<string, string>>({});
  const [treatmentCustom, setTreatmentCustom] = useState<Record<string, string>>({});
  const [productLines, setProductLines] = useState<TreatmentProductLine[]>([]);
  const { canInteract: canUsePayments } = useModuleAccess("payments");

  const { data: preloadedPatient } = useQuery({
    queryKey: ["patient", initialPatientUuid],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${initialPatientUuid}`, {
        params: { include: "summary" },
      });
      return res.data.data;
    },
    enabled: canFetch && !!initialPatientUuid && mode === "existing",
  });

  useEffect(() => {
    if (!patientFields?.length) return;
    const entity = mode === "existing" ? (selectedPatient as Record<string, unknown> | null) : null;
    const state = initFormState(patientFields, entity);
    if (mode === "new" && !state.values.gender) state.values.gender = "female";
    if (mode === "new" && !state.values.skin_type) state.values.skin_type = "combination";
    setPatientValues(state.values);
    setPatientCustom(state.customFields);
  }, [patientFields, selectedPatient, mode]);

  useEffect(() => {
    if (!treatmentFields?.length) return;
    const state = initFormState(treatmentFields, null);
    if (!state.values.session_date) state.values.session_date = new Date().toISOString().slice(0, 10);
    setTreatmentValues(state.values);
    setTreatmentCustom(state.customFields);
  }, [treatmentFields]);

  const updatePayment = (key: keyof typeof payment, value: string | boolean) =>
    setPayment((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (preloadedPatient && !selectedPatient) {
      setSelectedPatient(preloadedPatient);
    }
  }, [preloadedPatient, selectedPatient]);

  const appendPayload = (body: FormData, payload: Record<string, unknown>) => {
    Object.entries(payload).forEach(([key, val]) => {
      if (key === "custom_fields" && val && typeof val === "object") {
        Object.entries(val as Record<string, string>).forEach(([ck, cv]) => {
          body.append(`custom_fields[${ck}]`, String(cv));
        });
      } else if (val != null && val !== "") {
        body.append(key, String(val));
      }
    });
  };

  const appendImageFiles = (body: FormData, key: string, files: File[]) => {
    files
      .filter((f) => f instanceof File && f.size > 0 && /^image\/(jpeg|png|webp)$/i.test(f.type))
      .forEach((f, i) => body.append(`${key}[${i}]`, f, f.name));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (mode === "existing" && !selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!patientFields?.length || !treatmentFields?.length) return;

    if (mode === "new") {
      const patientError = validateFormFields(patientFields, patientValues, patientCustom);
      if (patientError) {
        toast.error(patientError);
        return;
      }
    }

    const treatmentError = validateFormFields(treatmentFields, treatmentValues, treatmentCustom);
    if (treatmentError) {
      toast.error(treatmentError);
      return;
    }

    if (payment.treatment_fee === "" || Number(payment.treatment_fee) < 0) {
      toast.error("Enter the treatment fee");
      return;
    }

    setLoading(true);
    const body = new FormData();
    body.append("intake_mode", mode);

    if (mode === "existing" && selectedPatient) {
      body.append("patient_uuid", selectedPatient.uuid);
      appendPayload(body, buildFormPayload(patientFields, patientValues, patientCustom));
    } else {
      appendPayload(body, buildFormPayload(patientFields, patientValues, patientCustom));
    }

    const treatmentPayload = buildFormPayload(treatmentFields, treatmentValues, treatmentCustom);
    delete treatmentPayload.total_price;
    appendPayload(body, treatmentPayload);
    body.append("treatment_fee", payment.treatment_fee);
    if (canUsePayments) {
      body.append("payment_method", payment.payment_method);
      body.append("payment_status", payment.payment_status);
      body.append("record_payment", payment.record_payment ? "1" : "0");
    } else {
      body.append("record_payment", "0");
    }

    productLinesToPayload(productLines).forEach((sale, i) => {
      body.append(`product_sales[${i}][product_uuid]`, sale.product_uuid);
      body.append(`product_sales[${i}][quantity]`, String(sale.quantity));
    });

    const appendImages = (key: string, files: File[]) => {
      files
        .filter((f) => f instanceof File && f.size > 0)
        .forEach((f, i) => body.append(`${key}[${i}]`, f, f.name));
    };

    appendImages("before_images", beforeImages);
    appendImages("after_images", afterImages);
    appendImages("progress_images", progressImages);
    documents
      .filter((f) => f instanceof File && f.size > 0)
      .forEach((f, i) => body.append(`documents[${i}]`, f, f.name));

    try {
      const res = await api.post("/intake", body);
      const productCount = productLinesToPayload(productLines).length;
      toast.success(
        productCount > 0
          ? `${res.data.message ?? "Saved"} — ${productCount} product(s) attached`
          : res.data.message ?? "Saved successfully"
      );
      router.push(`/patients/${res.data.data.patient.uuid}`);
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Failed to save"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
        }
      }}
      className="mx-auto max-w-4xl space-y-6 pb-12"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patient Intake</h1>
        <p className="text-slate-500">
          New patient or existing patient + treatment. In the treatment section, search and add products
          instantly — optional.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 rounded-2xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setMode("new");
            setSelectedPatient(null);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            mode === "new"
              ? "bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <UserPlus className="h-4 w-4" />
          New patient
        </button>
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            mode === "existing"
              ? "bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <User className="h-4 w-4" />
          Existing patient
        </button>
      </div>

      {/* Patient section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            {mode === "new" ? "New Patient Information" : "Select Patient"}
          </CardTitle>
          <CardDescription>
            {mode === "new"
              ? "Demographics & skin profile"
              : "Search and select — you can update skin notes below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "existing" ? (
            <div className="space-y-6">
              <PatientSearchSelect selected={selectedPatient} onSelect={setSelectedPatient} />
              {selectedPatient && (
                <DynamicFormFields
                  entityType="patient"
                  values={patientValues}
                  customFields={patientCustom}
                  onValuesChange={setPatientValues}
                  onCustomFieldsChange={setPatientCustom}
                  hideKeys={["full_name", "phone", "gender", "dob", "address"]}
                />
              )}
            </div>
          ) : (
            <DynamicFormFields
              entityType="patient"
              values={patientValues}
              customFields={patientCustom}
              onValuesChange={setPatientValues}
              onCustomFieldsChange={setPatientCustom}
              className="grid gap-4 sm:grid-cols-2"
            />
          )}
        </CardContent>
      </Card>

      {/* Treatment — shared */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-violet-600" />
            Treatment Session
          </CardTitle>
          <CardDescription>
            Diagnosis, notes, session date — search products below to add them immediately
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DynamicFormFields
            entityType="treatment_session"
            values={treatmentValues}
            customFields={treatmentCustom}
            onValuesChange={setTreatmentValues}
            onCustomFieldsChange={setTreatmentCustom}
            hideKeys={["total_price", "status"]}
          />
          <OptionalTreatmentProducts
            lines={productLines}
            onChange={setProductLines}
            onSubtotalChange={setProductSubtotal}
            embedded
          />
        </CardContent>
      </Card>

      {canUsePayments ? (
        <SessionCheckoutSection
          treatmentFee={payment.treatment_fee}
          onTreatmentFeeChange={(v) => updatePayment("treatment_fee", v)}
          productSubtotal={productSubtotal}
          paymentMethod={payment.payment_method}
          onPaymentMethodChange={(v) => updatePayment("payment_method", v)}
          paymentStatus={payment.payment_status}
          onPaymentStatusChange={(v) => updatePayment("payment_status", v)}
          recordPayment={payment.record_payment}
          onRecordPaymentChange={(v) => updatePayment("record_payment", v)}
        />
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <label className="text-sm font-medium">Treatment fee (USD) *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 max-w-xs"
                value={payment.treatment_fee}
                onChange={(e) => updatePayment("treatment_fee", e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                Session price is saved; payment recording requires admin access.
              </p>
            </CardContent>
          </Card>
          <ModuleLockedOverlay title="Payments — locked">
            <SessionCheckoutSection
              treatmentFee={payment.treatment_fee}
              onTreatmentFeeChange={(v) => updatePayment("treatment_fee", v)}
              productSubtotal={productSubtotal}
              paymentMethod={payment.payment_method}
              onPaymentMethodChange={(v) => updatePayment("payment_method", v)}
              paymentStatus={payment.payment_status}
              onPaymentStatusChange={(v) => updatePayment("payment_status", v)}
              recordPayment={false}
              onRecordPaymentChange={() => {}}
            />
          </ModuleLockedOverlay>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-violet-600" />
            Before / After Photos
          </CardTitle>
          <CardDescription>Upload comparison images for this session (optional)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <FileDropZone label="Before photos" description="Skin before treatment" files={beforeImages} onChange={setBeforeImages} variant="image" />
          <FileDropZone label="After photos" description="Results after treatment" files={afterImages} onChange={setAfterImages} variant="image" />
          <div className="md:col-span-2">
            <FileDropZone label="Progress photos" description="Mid-treatment (optional)" files={progressImages} onChange={setProgressImages} variant="image" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Documents & Attachments
          </CardTitle>
          <CardDescription>Lab reports, consent forms, PDFs (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropZone label="Upload files" description="PDF, images — max 20MB each" files={documents} onChange={setDocuments} variant="document" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={loading} className="w-full sm:min-w-[220px] sm:w-auto">
          <Sparkles className="h-4 w-4" />
          {loading
            ? "Saving..."
            : mode === "new"
              ? "Create patient & treatment"
              : "Add treatment to patient"}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
