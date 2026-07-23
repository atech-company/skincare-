"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass, labelClass } from "@/lib/form-styles";
import { formatCurrency } from "@/lib/utils";
import type { Invoice, InvoiceItem } from "@/types";

type DiscountType = "none" | "percent" | "fixed";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unit_price: string;
};

function emptyLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    quantity: "1",
    unit_price: "",
  };
}

function computeDiscount(subtotal: number, type: DiscountType, value: number) {
  if (type === "percent") {
    return Math.round((subtotal * Math.min(100, Math.max(0, value)) / 100) * 100) / 100;
  }
  if (type === "fixed") {
    return Math.min(subtotal, Math.round(Math.max(0, value) * 100) / 100);
  }
  return 0;
}

export function InvoiceForm({
  patientUuid,
  initial,
  onSubmit,
  loading,
}: {
  patientUuid?: string;
  initial?: Invoice;
  onSubmit: (values: {
    items: InvoiceItem[];
    discount_type: DiscountType;
    discount_value: number;
    notes?: string;
    treatment_session_uuid?: string;
  }) => Promise<void>;
  loading?: boolean;
}) {
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!initial) return;
    setLines(
      (initial.items ?? []).map((item, i) => ({
        key: `init-${i}`,
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
      }))
    );
    setDiscountType(initial.discount_type || "none");
    setDiscountValue(
      initial.discount_type === "none" ? "" : String(initial.discount_value ?? "")
    );
    setNotes(initial.notes ?? "");
  }, [initial]);

  const subtotal = useMemo(() => {
    return Math.round(
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unit_price) || 0;
        return sum + qty * price;
      }, 0) * 100
    ) / 100;
  }, [lines]);

  const discountAmount = computeDiscount(
    subtotal,
    discountType,
    Number(discountValue) || 0
  );
  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!patientUuid && !initial) return;

        const items: InvoiceItem[] = lines
          .filter((l) => l.description.trim())
          .map((l) => {
            const quantity = Math.max(0.01, Number(l.quantity) || 1);
            const unit_price = Math.max(0, Number(l.unit_price) || 0);
            return {
              description: l.description.trim(),
              quantity,
              unit_price,
              line_total: Math.round(quantity * unit_price * 100) / 100,
            };
          });

        if (items.length === 0) return;

        await onSubmit({
          items,
          discount_type: discountType,
          discount_value: discountType === "none" ? 0 : Number(discountValue) || 0,
          notes: notes || undefined,
          treatment_session_uuid: initial?.treatment_session_uuid,
        });
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Line items</label>
          <Button type="button" variant="secondary" size="sm" onClick={() => setLines((l) => [...l, emptyLine()])}>
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>
        {lines.map((line) => (
          <div key={line.key} className="grid gap-2 sm:grid-cols-[1fr_80px_100px_40px]">
            <Input
              placeholder="Description"
              value={line.description}
              onChange={(e) =>
                setLines((all) =>
                  all.map((l) => (l.key === line.key ? { ...l, description: e.target.value } : l))
                )
              }
              required
            />
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Qty"
              value={line.quantity}
              onChange={(e) =>
                setLines((all) =>
                  all.map((l) => (l.key === line.key ? { ...l, quantity: e.target.value } : l))
                )
              }
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              value={line.unit_price}
              onChange={(e) =>
                setLines((all) =>
                  all.map((l) => (l.key === line.key ? { ...l, unit_price: e.target.value } : l))
                )
              }
              required
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={lines.length <= 1}
              onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Discount</label>
          <select
            className={selectClass}
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
          >
            <option value="none">No discount</option>
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            {discountType === "percent" ? "Discount %" : "Discount amount"}
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            disabled={discountType === "none"}
            value={discountType === "none" ? "" : discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/30">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="mt-1 flex justify-between text-slate-600 dark:text-slate-400">
            <span>Discount</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between text-lg font-bold text-violet-700 dark:text-violet-300">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : initial ? "Update invoice" : "Create invoice"}
      </Button>
    </form>
  );
}
