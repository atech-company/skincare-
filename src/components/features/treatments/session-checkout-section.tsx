"use client";

import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function sessionGrandTotal(treatmentFee: string | number, productSubtotal: number) {
  const fee = typeof treatmentFee === "number" ? treatmentFee : Number(treatmentFee) || 0;
  return Math.round((fee + productSubtotal) * 100) / 100;
}

export function SessionCheckoutSection({
  treatmentFee,
  onTreatmentFeeChange,
  productSubtotal,
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
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (value: string) => void;
  recordPayment: boolean;
  onRecordPaymentChange: (value: boolean) => void;
}) {
  const grandTotal = sessionGrandTotal(treatmentFee, productSubtotal);

  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-transparent dark:border-violet-900/40 dark:from-violet-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-violet-600" />
          Payment
        </CardTitle>
        <CardDescription>
          Treatment fee plus products = total payment recorded for this session.
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

        <div className="rounded-xl border border-violet-300/60 bg-violet-100/50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Total payment amount
          </p>
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-200">
            {formatCurrency(grandTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Treatment {formatCurrency(Number(treatmentFee) || 0)}
            {productSubtotal > 0 && ` + products ${formatCurrency(productSubtotal)}`}
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
          Record payment linked to this treatment (uses total above)
        </label>
      </CardContent>
    </Card>
  );
}
