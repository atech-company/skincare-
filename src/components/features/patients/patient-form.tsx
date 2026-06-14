"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { useFormFields } from "@/hooks/use-form-fields";
import { buildFormPayload, initFormState, validateFormFields } from "@/lib/form-field-utils";
import type { Patient } from "@/types";

export type PatientFormData = Record<string, unknown>;

export function PatientForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<Patient>;
  onSubmit: (data: PatientFormData) => Promise<void>;
  loading?: boolean;
}) {
  const { data: fields } = useFormFields("patient");
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!fields?.length) return;
    const state = initFormState(fields, defaultValues as Record<string, unknown> | undefined);
    setValues(state.values);
    setCustomFields(state.customFields);
  }, [fields, defaultValues]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!fields?.length) return;
        const validationError = validateFormFields(fields, values, customFields);
        if (validationError) {
          toast.error(validationError);
          return;
        }
        await onSubmit(buildFormPayload(fields, values, customFields));
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <DynamicFormFields
          entityType="patient"
          values={values}
          customFields={customFields}
          onValuesChange={setValues}
          onCustomFieldsChange={setCustomFields}
          className="grid gap-4 sm:grid-cols-2 [&>div]:sm:col-span-1 [&>div:nth-child(-n+2)]:sm:col-span-1 [&>div:first-child]:sm:col-span-2"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading || !fields?.length}>
          {loading ? "Saving..." : defaultValues?.full_name ? "Save changes" : "Create patient"}
        </Button>
      </div>
    </form>
  );
}
