"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { labelClass } from "@/lib/form-styles";
import { ProductQuickCreateModal } from "@/components/features/products/product-quick-create-modal";
import { ProductSearchSelect } from "@/components/features/products/product-search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/types";

export type TreatmentProductLine = {
  id: string;
  product_uuid: string;
  quantity: number;
};

export function sumProductLinesTotal(
  lines: TreatmentProductLine[],
  productsByUuid: Record<string, Product>
): number {
  return lines
    .filter((l) => l.product_uuid)
    .reduce((sum, line) => {
      const p = productsByUuid[line.product_uuid];
      return sum + (p ? p.price * line.quantity : 0);
    }, 0);
}

export function TreatmentProductsPicker({
  lines,
  onChange,
  onSubtotalChange,
  asCard = true,
}: {
  lines: TreatmentProductLine[];
  onChange: (lines: TreatmentProductLine[]) => void;
  /** Notifies parent when product line subtotal changes (for payment total). */
  onSubtotalChange?: (subtotal: number) => void;
  /** Wrap in a card (intake / new session pages) */
  asCard?: boolean;
}) {
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const [searchSelection, setSearchSelection] = useState<Product | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const filledLines = lines.filter((l) => l.product_uuid);

  const cacheProduct = (p: Product) => {
    setProductCache((c) => ({ ...c, [p.uuid]: p }));
  };

  const resolveProduct = (uuid: string) => productCache[uuid];

  const addProductImmediately = (p: Product, quantity = 1) => {
    cacheProduct(p);
    const qty = Math.max(1, quantity);
    const existing = filledLines.find((l) => l.product_uuid === p.uuid);
    if (existing) {
      onChange(
        lines.map((l) =>
          l.id === existing.id ? { ...l, quantity: l.quantity + qty } : l
        )
      );
      toast.success(`${p.product_name} — quantity ${existing.quantity + qty}`);
    } else {
      onChange([
        ...lines.filter((l) => l.product_uuid),
        { id: `line_${Date.now()}`, product_uuid: p.uuid, quantity: qty },
      ]);
      toast.success(`Added ${p.product_name}`);
    }
    setSearchSelection(null);
  };

  const updateLine = (id: string, patch: Partial<TreatmentProductLine>) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const total = sumProductLinesTotal(lines, productCache);

  useEffect(() => {
    onSubtotalChange?.(total);
  }, [total, onSubtotalChange]);

  const body = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!asCard && <Package className="h-4 w-4 text-violet-600" />}
        {!asCard && (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Products</p>
        )}
        <Badge variant="muted">Optional</Badge>
      </div>

      <div className="rounded-xl border border-violet-200/80 bg-violet-50/30 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className={labelClass}>Search and add product</label>
          <Button type="button" variant="secondary" size="sm" onClick={() => setQuickCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add new product
          </Button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Search existing products, or create a new one with cost, sell price, and quantity.
        </p>
        <ProductSearchSelect
          selected={searchSelection}
          placeholder="Search product by name or brand…"
          onSelect={(p) => {
            if (p) addProductImmediately(p);
            else setSearchSelection(null);
          }}
        />
      </div>

      <ProductQuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(product, saleQuantity) => addProductImmediately(product, saleQuantity)}
      />

      {filledLines.length === 0 ? (
        <p className="text-xs text-slate-500">
          No products added yet. Use the search above to attach products sold or given during this visit.
        </p>
      ) : (
        <ul className="space-y-2">
          {filledLines.map((line) => {
            const product = resolveProduct(line.product_uuid);
            if (!product) return null;
            return (
              <li
                key={line.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.product_name}</p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(product.price)} each
                    {product.brand && ` · ${product.brand}`}
                    {` · stock ${product.stock_quantity}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <label className="sr-only">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                    />
                  </div>
                  <span className="min-w-[4.5rem] text-sm font-medium text-violet-600">
                    {formatCurrency(product.price * line.quantity)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(line.id)}
                    aria-label={`Remove ${product.product_name}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filledLines.length > 0 && total > 0 && (
        <p className="text-sm font-medium text-violet-600">
          Products subtotal: {formatCurrency(total)} ({filledLines.length} item
          {filledLines.length === 1 ? "" : "s"})
        </p>
      )}
    </div>
  );

  if (!asCard) {
    return (
      <div className="mt-6 space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-violet-600" />
          Treatment products
          <Badge variant="muted">Optional</Badge>
        </CardTitle>
        <CardDescription>
          Search existing products or add a new one with cost and sell price. Inventory updates when you save.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export function productLinesToPayload(lines: TreatmentProductLine[]) {
  return lines
    .filter((l) => l.product_uuid)
    .map((l) => ({ product_uuid: l.product_uuid, quantity: l.quantity }));
}
