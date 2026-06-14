"use client";

import {
  TreatmentProductsPicker,
  type TreatmentProductLine,
} from "@/components/features/treatments/treatment-products-picker";

/** Optional product lines block — use inside treatment session forms (intake + new session). */
export function OptionalTreatmentProducts({
  lines,
  onChange,
  onSubtotalChange,
  embedded = false,
}: {
  lines: TreatmentProductLine[];
  onChange: (lines: TreatmentProductLine[]) => void;
  onSubtotalChange?: (subtotal: number) => void;
  /** Inside another card (no outer card wrapper) */
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
        <TreatmentProductsPicker
          lines={lines}
          onChange={onChange}
          onSubtotalChange={onSubtotalChange}
          asCard={false}
        />
      </div>
    );
  }

  return (
    <TreatmentProductsPicker
      lines={lines}
      onChange={onChange}
      onSubtotalChange={onSubtotalChange}
      asCard
    />
  );
}

export type { TreatmentProductLine };
export { productLinesToPayload } from "@/components/features/treatments/treatment-products-picker";
