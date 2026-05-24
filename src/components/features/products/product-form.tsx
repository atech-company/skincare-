"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass, textareaClass } from "@/lib/form-styles";
import type { Product } from "@/types";

export type ProductFormValues = {
  product_name: string;
  brand: string;
  category: string;
  description: string;
  usage_instructions: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
};

const defaultValues: ProductFormValues = {
  product_name: "",
  brand: "",
  category: "skincare",
  description: "",
  usage_instructions: "",
  price: "",
  stock_quantity: "0",
  is_active: true,
};

export function ProductForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Product;
  onSubmit: (values: ProductFormValues, image?: File | null) => Promise<void>;
  loading?: boolean;
}) {
  const [form, setForm] = useState<ProductFormValues>(
    initial
      ? {
          product_name: initial.product_name,
          brand: initial.brand ?? "",
          category: initial.category,
          description: initial.description ?? "",
          usage_instructions: initial.usage_instructions ?? "",
          price: String(initial.price),
          stock_quantity: String(initial.stock_quantity),
          is_active: initial.is_active,
        }
      : defaultValues
  );
  const [image, setImage] = useState<File | null>(null);

  const set = (key: keyof ProductFormValues, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form, image);
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium">Product name *</label>
        <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Brand</label>
          <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Category *</label>
          <select className={selectClass} value={form.category} onChange={(e) => set("category", e.target.value)} required>
            {["skincare", "serum", "cleanser", "moisturizer", "sunscreen", "treatment", "other"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Price *</label>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Stock</label>
          <Input type="number" min="0" value={form.stock_quantity} onChange={(e) => set("stock_quantity", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea className={textareaClass} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Usage instructions</label>
        <textarea className={textareaClass} value={form.usage_instructions} onChange={(e) => set("usage_instructions", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Image</label>
        <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
      </div>
      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Active in catalog
        </label>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : initial ? "Update product" : "Create product"}
      </Button>
    </form>
  );
}
