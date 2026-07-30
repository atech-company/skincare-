"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import { ProductSearchSelect } from "@/components/features/products/product-search-select";
import { formatCurrency } from "@/lib/utils";
import type { Product, TreatmentProductSale } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function TreatmentProductSales({
  sessionUuid,
  sales,
  onChanged,
}: {
  sessionUuid: string;
  sales?: TreatmentProductSale[];
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [routinePeriod, setRoutinePeriod] = useState<"" | "morning" | "night" | "other">("");
  const [instructions, setInstructions] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/treatment-sessions/${sessionUuid}/product-sales`, {
        product_uuid: selectedProduct!.uuid,
        quantity,
        ...(routinePeriod ? { routine_period: routinePeriod } : {}),
        ...(instructions.trim() ? { dosage_notes: instructions.trim() } : {}),
      });
    },
    onSuccess: () => {
      toast.success(
        routinePeriod
          ? "Product sold and added to routine"
          : "Product sold and added to patient Products (Other)"
      );
      setSelectedProduct(null);
      setQuantity(1);
      setRoutinePeriod("");
      setInstructions("");
      queryClient.invalidateQueries({ queryKey: ["treatment", sessionUuid] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onChanged();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Could not add product sale");
    },
  });

  const removeSale = async (sale: TreatmentProductSale) => {
    try {
      await api.delete(`/treatment-product-sales/${sale.id}`);
      toast.success("Sale removed — stock restored");
      queryClient.invalidateQueries({ queryKey: ["treatment", sessionUuid] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onChanged();
    } catch {
      toast.error("Could not remove sale");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Products sold in this treatment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Product</label>
            <ProductSearchSelect
              selected={selectedProduct}
              onSelect={setSelectedProduct}
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div>
            <label className={labelClass}>Use when</label>
            <select
              className={selectClass}
              value={routinePeriod}
              onChange={(e) =>
                setRoutinePeriod(e.target.value as "" | "morning" | "night" | "other")
              }
            >
              <option value="">Other (optional)</option>
              <option value="morning">Morning</option>
              <option value="night">Night</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Instructions</label>
            <textarea
              className={textareaClass}
              rows={2}
              placeholder="How to use"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </div>
        {selectedProduct && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Line total: {formatCurrency(selectedProduct.price * quantity)}
            {selectedProduct.is_low_stock && (
              <Badge variant="warning" className="ml-2">Low stock</Badge>
            )}
          </p>
        )}
        <Button
          size="sm"
          disabled={!selectedProduct || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          <Plus className="h-4 w-4" /> Add product sale
        </Button>

        <ul className="space-y-2">
          {(sales ?? []).map((sale) => (
            <li
              key={sale.id}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 p-3 dark:border-slate-700"
            >
              <div>
                <p className="font-medium">{sale.product?.product_name ?? "Product"}</p>
                <p className="text-xs text-slate-500">
                  Qty {sale.quantity} · {formatCurrency(Number(sale.total))}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSale(sale)}
                aria-label="Remove sale"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </li>
          ))}
          {!sales?.length && (
            <p className="text-sm text-slate-500">No products sold in this session yet.</p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
