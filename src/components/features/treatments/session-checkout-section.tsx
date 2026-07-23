"use client";

import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/lib/form-styles";

export type DiscountType = "none" | "percent" | "fixed";

export function sessionSubtotal(treatmentFee: string | number, productSubtotal: number) {
  const fee = typeof treatmentFee === "number" ? treatmentFee : Number(treatmentFee) || 0;
  return Math.round((fee + productSubtotal) * 100) / 100;
}

export function sessionDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: string | number
) {
  const value = typeof discountValue === "number" ? discountValue : Number(discountValue) || 0;
  if (discountType === "percent") {
    return Math.round((subtotal * Math.min(100, Math.max(0, value)) / 100) * 100) / 100;
  }
  if (discountType === "fixed") {
    return Math.min(subtotal, Math.round(Math.max(0, value) * 100) / 100);
  }
  return 0;
}

export function sessionGrandTotal(
  treatmentFee: string | number,
  productSubtotal: number,
  discountType: DiscountType = "none",
  discountValue: string | number = 0
) {
  const subtotal = sessionSubtotal(treatmentFee, productSubtotal);
  const discount = sessionDiscountAmount(subtotal, discountType, discountValue);
  return Math.round((subtotal - discount) * 100) / 100;
}

export function SessionCheckoutSection({
  treatmentFee,
  onTreatmentFeeChange,
  productSubtotal,
  discountType = "none",
  onDiscountTypeChange,
  discountValue = "",
  onDiscountValueChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentStatus,
  onPaymentStatusChange,
  recordPayment,
  onRecordPaymentChange,
}: {
  treatmentFee: string;
  onTreatmentFeeChange: (value: string) => void;
  productSubtotal: number;
  discountType?: DiscountType;
  onDiscountTypeChange?: (value: DiscountType) => void;
  discountValue?: string;
  onDiscountValueChange?: (value: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (value: string) => void;
  recordPayment: boolean;
  onRecordPaymentChange: (value: boolean) => void;
}) {
  const subtotal = sessionSubtotal(treatmentFee, productSubtotal);
  const discount = sessionDiscountAmount(subtotal, discountType, discountValue);
  const grandTotal = Math.round((subtotal - discount) * 100) / 100;
  const showDiscount = !!onDiscountTypeChange && !!onDiscountValueChange;

  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-transparent dark:border-violet-900/40 dark:from-violet-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-violet-600" />
          Payment
        </CardTitle>
        <CardDescription>
          Treatment fee plus products, optional discount, then total due.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Treatment fee (USD) *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={treatmentFee}
              onChange={(e) => onTreatmentFeeChange(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col justify-end rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500">Products on this visit</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {formatCurrency(productSubtotal)}
            </p>
          </div>
        </div>

        {showDiscount && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Discount</label>
              <select
                className={`${selectClass} mt-1`}
                value={discountType}
                onChange={(e) => onDiscountTypeChange(e.target.value as DiscountType)}
              >
                <option value="none">No discount</option>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {discountType === "percent" ? "Discount %" : "Discount amount"}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="mt-1"
                disabled={discountType === "none"}
                placeholder={discountType === "percent" ? "10" : "0.00"}
                value={discountType === "none" ? "" : discountValue}
                onChange={(e) => onDiscountValueChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-violet-300/60 bg-violet-100/50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Invoice total
          </p>
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-200">
            {formatCurrency(grandTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Subtotal {formatCurrency(subtotal)}
            {discount > 0 && ` − discount ${formatCurrency(discount)}`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Payment method</label>
            <select
              className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Payment status</label>
            <select
              className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={paymentStatus}
              onChange={(e) => onPaymentStatusChange(e.target.value)}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recordPayment}
            onChange={(e) => onRecordPaymentChange(e.target.checked)}
            className="rounded border-slate-300"
          />
          Record payment linked to this invoice (uses total above)
        </label>
      </CardContent>
    </Card>
  );
}
