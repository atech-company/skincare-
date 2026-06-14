"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { useFormFields } from "@/hooks/use-form-fields";
import { buildFormPayload, initFormState } from "@/lib/form-field-utils";
import { selectClass, labelClass } from "@/lib/form-styles";
import type { Payment, TreatmentSession } from "@/types";

type SessionAccounting = {
  treatment_amount: number;
  product_sales_amount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
};

export function PaymentForm({
  patientUuid,
  defaultTreatmentSessionUuid,
  suggestedAmount,
  initial,
  onSubmit,
  loading,
}: {
  patientUuid?: string;
  defaultTreatmentSessionUuid?: string;
  suggestedAmount?: number;
  initial?: Payment;
  onSubmit: (values: Record<string, unknown> & { treatment_session_uuid: string }) => Promise<void>;
  loading?: boolean;
}) {
  const { data: fields } = useFormFields("payment");
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [sessionUuid, setSessionUuid] = useState(
    initial?.treatment_session_uuid ?? defaultTreatmentSessionUuid ?? ""
  );

  const effectivePatientUuid = patientUuid ?? initial?.patient_uuid;

  const { data: sessions } = useQuery({
    queryKey: ["patient-sessions-payments", effectivePatientUuid],
    enabled: !!effectivePatientUuid,
    queryFn: async () => {
      const res = await api.get("/treatment-sessions", {
        params: { patient_uuid: effectivePatientUuid, per_page: 50 },
      });
      return unwrapList<TreatmentSession>(res.data);
    },
  });

  const selectedSession = sessions?.find((s) => s.uuid === sessionUuid);

  const { data: sessionDetail } = useQuery({
    queryKey: ["treatment", sessionUuid, "payment-form"],
    enabled: !!sessionUuid && !initial,
    queryFn: async () => {
      const res = await api.get<{ data: TreatmentSession & { accounting?: SessionAccounting } }>(
        `/treatment-sessions/${sessionUuid}`
      );
      return res.data.data;
    },
  });

  const accounting = sessionDetail?.accounting;

  useEffect(() => {
    if (!fields?.length) return;
    const state = initFormState(fields, initial as Record<string, unknown> | undefined);
    if (!state.values.paid_at) state.values.paid_at = new Date().toISOString().slice(0, 10);
    if (!state.values.payment_method) state.values.payment_method = "cash";
    if (!state.values.status) state.values.status = "paid";
    setValues(state.values);
    setCustomFields(state.customFields);
  }, [fields, initial]);

  useEffect(() => {
    if (initial || !fields?.length) return;

    const balance =
      suggestedAmount != null && suggestedAmount > 0
        ? suggestedAmount
        : accounting?.balance;

    const fullTotal = accounting?.total_amount;

    if (balance != null && balance > 0) {
      setValues((v) => ({ ...v, amount: String(balance) }));
    } else if (fullTotal != null && fullTotal > 0 && !values.amount) {
      setValues((v) => ({ ...v, amount: String(fullTotal) }));
    } else if (selectedSession && !values.amount) {
      setValues((v) => ({ ...v, amount: String(selectedSession.total_price ?? "") }));
    }
  }, [
    selectedSession?.uuid,
    selectedSession?.total_price,
    initial,
    suggestedAmount,
    accounting?.balance,
    accounting?.total_amount,
    fields?.length,
    values.amount,
  ]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!fields?.length) return;
        await onSubmit({
          ...buildFormPayload(fields, values, customFields),
          treatment_session_uuid: sessionUuid,
        });
      }}
      className="space-y-4"
    >
      {effectivePatientUuid && (
        <div>
          <label className={labelClass}>Link to treatment (optional)</label>
          <select className={selectClass} value={sessionUuid} onChange={(e) => setSessionUuid(e.target.value)}>
            <option value="">General payment (not tied to a visit)</option>
            {sessions?.map((s) => (
              <option key={s.uuid} value={s.uuid}>
                {s.treatment_name} — {formatDate(s.session_date)} ({formatCurrency(Number(s.total_price))})
              </option>
            ))}
          </select>
        </div>
      )}

      {accounting && sessionUuid && (
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 text-sm dark:border-violet-900/50 dark:bg-violet-950/30">
          <p className="font-medium text-violet-800 dark:text-violet-200">Session total</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Treatment {formatCurrency(accounting.treatment_amount)}
            {accounting.product_sales_amount > 0 &&
              ` + products ${formatCurrency(accounting.product_sales_amount)}`}
            {" "}= {formatCurrency(accounting.total_amount)}
          </p>
          <p className="mt-2 text-lg font-bold text-violet-700 dark:text-violet-300">
            {accounting.balance > 0 ? (
              <>
                Still owed {formatCurrency(accounting.balance)}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  (paid {formatCurrency(accounting.paid_amount)})
                </span>
              </>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300">Paid in full</span>
            )}
          </p>
        </div>
      )}

      <DynamicFormFields
        entityType="payment"
        definitions={fields}
        values={values}
        customFields={customFields}
        onValuesChange={setValues}
        onCustomFieldsChange={setCustomFields}
      />

      <Button type="submit" disabled={loading || !fields?.length} className="w-full">
        {loading ? "Saving..." : initial ? "Update payment" : "Record payment"}
      </Button>
    </form>
  );
}
