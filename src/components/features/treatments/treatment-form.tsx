"use client";



import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";

import { PatientSearchSelect } from "@/components/features/patients/patient-search-select";

import { useFormFields } from "@/hooks/use-form-fields";

import { buildFormPayload, initFormState } from "@/lib/form-field-utils";

import {

  OptionalTreatmentProducts,

  productLinesToPayload,

  type TreatmentProductLine,

} from "@/components/features/treatments/optional-treatment-products";

import { SessionCheckoutSection } from "@/components/features/treatments/session-checkout-section";

import type { Patient, TreatmentSession } from "@/types";



export function TreatmentForm({

  initial,

  showPatientPicker,

  defaultPatientUuid,

  onSubmit,

  loading,

  showProducts = true,

  showCheckout = false,

}: {

  initial?: TreatmentSession;

  showPatientPicker?: boolean;

  defaultPatientUuid?: string;

  onSubmit: (values: Record<string, unknown> & { patient_uuid: string }) => Promise<void>;

  loading?: boolean;

  /** Show optional product lines (create / intake only) */

  showProducts?: boolean;

  /** Payment block (treatment fee + products = recorded payment) */

  showCheckout?: boolean;

}) {

  const { data: fields } = useFormFields("treatment_session");

  const [patient, setPatient] = useState<Patient | null>(null);

  const [values, setValues] = useState<Record<string, string>>({});

  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const [productLines, setProductLines] = useState<TreatmentProductLine[]>([]);

  const [productSubtotal, setProductSubtotal] = useState(0);

  const [payment, setPayment] = useState({

    treatment_fee: "",

    payment_method: "cash",

    payment_status: "paid",

    record_payment: true,

    discount_type: "none" as "none" | "percent" | "fixed",

    discount_value: "",

  });



  const hideKeys = initial

    ? []

    : ["follow_up_notes", "status", ...(showCheckout ? ["total_price"] : [])];

  const attachProducts = showProducts && !initial;

  const attachCheckout = showCheckout && !initial;



  useEffect(() => {

    if (!fields?.length) return;

    const state = initFormState(fields, initial as Record<string, unknown> | undefined);

    if (!initial) {

      state.values.session_date = state.values.session_date || new Date().toISOString().slice(0, 10);

      state.values.status = state.values.status || "scheduled";

    }

    setValues(state.values);

    setCustomFields(state.customFields);

    if (!initial && state.values.total_price) {

      setPayment((p) => ({ ...p, treatment_fee: String(state.values.total_price) }));

    }

  }, [fields, initial]);



  const setPay = (key: keyof typeof payment, value: string | boolean) =>

    setPayment((f) => ({ ...f, [key]: value }));



  return (

    <form

      onSubmit={async (e) => {

        e.preventDefault();

        if (!fields?.length) return;

        const patientUuid = patient?.uuid ?? defaultPatientUuid;

        if (showPatientPicker && !patientUuid) return;



        if (attachCheckout && (payment.treatment_fee === "" || Number(payment.treatment_fee) < 0)) {
          toast.error("Enter the treatment fee");
          return;
        }



        const sales = productLinesToPayload(productLines);

        const payload: Record<string, unknown> = {

          patient_uuid: patientUuid ?? "",

          ...buildFormPayload(fields, values, customFields),

          ...(sales.length ? { product_sales: sales } : {}),

        };



        if (attachCheckout) {

          payload.treatment_fee = payment.treatment_fee;

          payload.payment_method = payment.payment_method;

          payload.payment_status = payment.payment_status;

          payload.record_payment = payment.record_payment;

          payload.discount_type = payment.discount_type;

          payload.discount_value = payment.discount_type === "none" ? 0 : Number(payment.discount_value) || 0;

          delete payload.total_price;

        }



        await onSubmit(payload as Record<string, unknown> & { patient_uuid: string });

      }}

      className="space-y-4"

    >

      {showPatientPicker && <PatientSearchSelect selected={patient} onSelect={setPatient} />}



      <Card>

        <CardHeader className="pb-3">

          <CardTitle className="text-base">Session details</CardTitle>

          {!initial && (

            <p className="text-sm text-slate-500">

              Treatment info — search and add products below (optional).

            </p>

          )}

        </CardHeader>

        <CardContent>

          <DynamicFormFields

            entityType="treatment_session"

            definitions={fields}

            values={values}

            customFields={customFields}

            onValuesChange={setValues}

            onCustomFieldsChange={setCustomFields}

            hideKeys={hideKeys}

            allowAdHoc={!initial}

          />

          {attachProducts && (

            <OptionalTreatmentProducts

              lines={productLines}

              onChange={setProductLines}

              onSubtotalChange={setProductSubtotal}

              embedded

            />

          )}

        </CardContent>

      </Card>



      {attachCheckout && (

        <SessionCheckoutSection

          treatmentFee={payment.treatment_fee}

          onTreatmentFeeChange={(v) => setPay("treatment_fee", v)}

          productSubtotal={productSubtotal}

          discountType={payment.discount_type}

          onDiscountTypeChange={(v) => setPay("discount_type", v)}

          discountValue={payment.discount_value}

          onDiscountValueChange={(v) => setPay("discount_value", v)}

          paymentMethod={payment.payment_method}

          onPaymentMethodChange={(v) => setPay("payment_method", v)}

          paymentStatus={payment.payment_status}

          onPaymentStatusChange={(v) => setPay("payment_status", v)}

          recordPayment={payment.record_payment}

          onRecordPaymentChange={(v) => setPay("record_payment", v)}

        />

      )}



      <Button

        type="submit"

        disabled={loading || !fields?.length || (showPatientPicker && !patient && !defaultPatientUuid)}

        className="w-full"

      >

        {loading ? "Saving..." : initial ? "Update session" : "Create session"}

      </Button>

    </form>

  );

}


