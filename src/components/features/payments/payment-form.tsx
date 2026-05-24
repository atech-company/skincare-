"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass, textareaClass } from "@/lib/form-styles";
import type { Payment } from "@/types";

export function PaymentForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Payment;
  onSubmit: (values: {
    amount: string;
    payment_method: string;
    status: string;
    reference: string;
    notes: string;
    paid_at: string;
  }) => Promise<void>;
  loading?: boolean;
}) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [method, setMethod] = useState(initial?.payment_method ?? "cash");
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [paidAt, setPaidAt] = useState(initial?.paid_at?.slice(0, 10) ?? "");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ amount, payment_method: method, status, reference, notes, paid_at: paidAt });
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium">Amount *</label>
        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Method</label>
          <select className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            {["cash", "card", "bank_transfer", "other"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {["pending", "paid", "partial", "refunded", "cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Reference</label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Paid date</label>
        <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : initial ? "Update payment" : "Record payment"}
      </Button>
    </form>
  );
}
