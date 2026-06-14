"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { labelClass } from "@/lib/form-styles";
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

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/treatment-sessions/${sessionUuid}/product-sales`, {
        product_uuid: selectedProduct!.uuid,
        quantity,
      });
    },
    onSuccess: () => {
      toast.success("Product sold — stock updated");
      setSelectedProduct(null);
      setQuantity(1);
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

        {!sales?.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No products sold yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 dark:border-slate-700">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.uuid} className="border-b dark:border-slate-800">
                    <td className="py-2 pr-4">{s.product?.product_name ?? "—"}</td>
                    <td className="py-2 pr-4">{s.quantity}</td>
                    <td className="py-2 pr-4">{formatCurrency(s.unit_price)}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(s.total)}</td>
                    <td className="py-2">
                      <Button variant="ghost" size="icon" onClick={() => void removeSale(s)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
