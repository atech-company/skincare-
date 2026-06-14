"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { useFormFields } from "@/hooks/use-form-fields";
import { buildFormPayload, initFormState } from "@/lib/form-field-utils";
import type { Product } from "@/types";

export type ProductFormValues = Record<string, unknown> & { is_active?: boolean };

export function ProductForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Product;
  onSubmit: (values: ProductFormValues, image?: File | null) => Promise<void>;
  loading?: boolean;
}) {
  const { data: fields } = useFormFields("product");
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    if (!fields?.length) return;
    const state = initFormState(fields, initial as Record<string, unknown> | undefined);
    if (!initial) {
      state.values.category = state.values.category || "skincare";
      state.values.stock_quantity = state.values.stock_quantity || "0";
      state.values.purchase_price = state.values.purchase_price || "0";
      state.values.low_stock_threshold = state.values.low_stock_threshold || "5";
    }
    setValues(state.values);
    setCustomFields(state.customFields);
  }, [fields, initial]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!fields?.length) return;
        const payload = buildFormPayload(fields, values, customFields);
        if (initial) payload.is_active = isActive;
        await onSubmit(payload, image);
      }}
      className="space-y-4"
    >
      <DynamicFormFields
        entityType="product"
        values={values}
        customFields={customFields}
        onValuesChange={setValues}
        onCustomFieldsChange={setCustomFields}
      />
      <div>
        <label className="text-sm font-medium">Image</label>
        <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
      </div>
      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active in catalog
        </label>
      )}
      <Button type="submit" disabled={loading || !fields?.length} className="w-full">
        {loading ? "Saving..." : initial ? "Update product" : "Create product"}
      </Button>
    </form>
  );
}
