"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import { ProductForm, type ProductFormValues } from "@/components/features/products/product-form";
import { formatCurrency } from "@/lib/utils";
import { ExportPrintMenu } from "@/components/shared/export-print-menu";

function buildProductFormData(values: ProductFormValues, image?: File | null, isEdit?: boolean) {
  const form = new FormData();
  Object.entries(values).forEach(([key, val]) => {
    if (key === "is_active") return;
    if (key === "custom_fields" && val && typeof val === "object") {
      Object.entries(val as Record<string, string>).forEach(([ck, cv]) => {
        form.append(`custom_fields[${ck}]`, String(cv));
      });
    } else if (val != null && val !== "") {
      form.append(key, String(val));
    }
  });
  if (isEdit && values.is_active != null) form.append("is_active", values.is_active ? "1" : "0");
  if (image) form.append("image", image);
  return form;
}

export default function ProductsPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, lowStockOnly],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get("/products", {
        params: { search: search || undefined, low_stock: lowStockOnly || undefined },
      });
      return unwrapList<Product>(res.data);
    },
    staleTime: 2 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      values,
      image,
      productId,
    }: {
      values: ProductFormValues;
      image?: File | null;
      productId?: number;
    }) => {
      if (productId) {
        if (image) {
          const form = buildProductFormData(values, image, true);
          form.append("_method", "PUT");
          await api.post(`/products/${productId}`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          await api.put(`/products/${productId}`, values);
        }
      } else {
        await api.post("/products", buildProductFormData(values, image), {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(modal === "edit" ? "Product updated" : "Product created");
      setModal(null);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save product"),
  });

  const handleDelete = async (p: Product) => {
    if (!(await confirmDelete(`Delete "${p.product_name}"?`))) return;
    if (await deleteResource(`/products/${p.id}`)) {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Products & Inventory</h1>
          <p className="text-sm text-slate-500">Catalog, stock levels, and low-stock alerts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPrintMenu
            items={[
              {
                type: "report",
                report: "inventory",
                format: "pdf",
                label: "PDF (A4)",
                params: { low_stock: lowStockOnly ? "1" : undefined },
              },
              {
                type: "report",
                report: "inventory",
                format: "csv",
                label: "Excel (CSV)",
                params: { low_stock: lowStockOnly ? "1" : undefined },
              },
            ]}
            label="Export inventory"
          />
          <Button onClick={() => setModal("create")}>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Card key={p.uuid} className={p.is_low_stock ? "border-amber-300 dark:border-amber-700" : ""}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                {p.image_url ? (
                  <Image src={p.image_url} alt="" width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.product_name}</p>
                  <p className="text-sm text-slate-500">{p.brand || p.category}</p>
                  <p className="font-medium text-violet-600">{formatCurrency(Number(p.price))}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={p.is_active ? "success" : "muted"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant={p.is_low_stock ? "warning" : "muted"}>Stock: {p.stock_quantity}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <CrudActions
                  onEdit={() => {
                    setEditing(p);
                    setModal("edit");
                  }}
                  onDelete={() => handleDelete(p)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && !data?.length && <p className="text-sm text-slate-500">No products found.</p>}

      <Modal
        open={modal !== null}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        title={modal === "edit" ? "Edit product" : "New product"}
      >
        <ProductForm
          initial={editing ?? undefined}
          loading={saveMutation.isPending}
          onSubmit={async (values, image) => {
            await saveMutation.mutateAsync({
              values,
              image,
              productId: editing?.id,
            });
          }}
        />
      </Modal>
    </div>
  );
}
