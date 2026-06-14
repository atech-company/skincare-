"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { labelClass } from "@/lib/form-styles";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function ProductQuickCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Called with the new catalog product and quantity to attach to the current treatment */
  onCreated: (product: Product, saleQuantity: number) => void;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    brand: "",
    purchase_price: "",
    price: "",
    stock_quantity: "0",
    sale_quantity: "1",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm({
      product_name: "",
      brand: "",
      purchase_price: "",
      price: "",
      stock_quantity: "0",
      sale_quantity: "1",
    });
  };

  const createProduct = async () => {
    const name = form.product_name.trim();
    const price = Number(form.price);
    const purchasePrice = form.purchase_price === "" ? 0 : Number(form.purchase_price);
    const stock = Math.max(0, parseInt(form.stock_quantity, 10) || 0);
    const saleQty = Math.max(1, parseInt(form.sale_quantity, 10) || 1);

    if (!name) {
      toast.error("Product name is required");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a valid sell price");
      return;
    }
    if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
      toast.error("Enter a valid cost price");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ data: Product }>("/products", {
        product_name: name,
        brand: form.brand.trim() || undefined,
        category: "skincare",
        price,
        purchase_price: purchasePrice,
        stock_quantity: stock,
        low_stock_threshold: 5,
      });
      const product = res.data.data;
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onCreated(product, saleQty);
      toast.success(`"${product.product_name}" created and added`);
      reset();
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const first = ax.response?.data?.errors
        ? Object.values(ax.response.data.errors)[0]?.[0]
        : null;
      toast.error(first ?? ax.response?.data?.message ?? "Could not create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) {
          reset();
          onClose();
        }
      }}
      title="Add new product"
      description="Create a catalog item and attach it to this visit in one step."
      className="max-w-md"
    >
      <div
        className="space-y-4"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            if (!loading) void createProduct();
          }
        }}
      >
        <div>
          <label className={labelClass}>Product name *</label>
          <Input
            value={form.product_name}
            onChange={(e) => set("product_name", e.target.value)}
            placeholder="e.g. Hydrating Serum"
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Brand</label>
          <Input
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cost (purchase price)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.purchase_price}
              onChange={(e) => set("purchase_price", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass}>Sell price *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Stock quantity</label>
            <Input
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={(e) => set("stock_quantity", e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">Inventory on hand in catalog</p>
          </div>
          <div>
            <label className={labelClass}>Qty for this visit *</label>
            <Input
              type="number"
              min="1"
              value={form.sale_quantity}
              onChange={(e) => set("sale_quantity", e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">Units sold on this treatment</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            disabled={loading}
            className="flex-1 sm:flex-none"
            onClick={(e) => {
              e.stopPropagation();
              void createProduct();
            }}
          >
            <PackagePlus className="h-4 w-4" />
            {loading ? "Creating…" : "Create & add to visit"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
