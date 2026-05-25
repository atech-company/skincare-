"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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

function buildProductFormData(values: ProductFormValues, image?: File | null, isEdit?: boolean) {
  const form = new FormData();
  form.append("product_name", values.product_name);
  if (values.brand) form.append("brand", values.brand);
  form.append("category", values.category);
  if (values.description) form.append("description", values.description);
  if (values.usage_instructions) form.append("usage_instructions", values.usage_instructions);
  form.append("price", values.price);
  form.append("stock_quantity", values.stock_quantity);
  if (isEdit) form.append("is_active", values.is_active ? "1" : "0");
  if (image) form.append("image", image);
  return form;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const res = await api.get("/products", { params: { search } });
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
          await api.put(`/products/${productId}`, {
            product_name: values.product_name,
            brand: values.brand || null,
            category: values.category,
            description: values.description || null,
            usage_instructions: values.usage_instructions || null,
            price: parseFloat(values.price),
            stock_quantity: parseInt(values.stock_quantity, 10) || 0,
            is_active: values.is_active,
          });
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

  const openEdit = (product: Product) => {
    setEditing(product);
    setModal("edit");
  };

  const handleDelete = async (product: Product) => {
    if (!(await confirmDelete(`Delete "${product.product_name}"?`))) return;
    if (await deleteResource(`/products/${product.id}`)) {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-slate-500">Add, edit, or remove catalog items</p>
        </div>
        <Button onClick={() => { setEditing(null); setModal("create"); }}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      <Input
        className="max-w-sm"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          data?.map((product) => (
            <Card key={product.uuid} className="overflow-hidden">
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                {product.image_url && (
                  <Image src={product.image_url} alt={product.product_name} fill sizes="25vw" className="object-cover" />
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-semibold">{product.product_name}</p>
                  <p className="text-sm text-slate-500">{product.brand}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="muted">{product.category}</Badge>
                    <span className="font-medium text-violet-600">{formatCurrency(Number(product.price))}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Stock: {product.stock_quantity}</p>
                </div>
                <CrudActions onEdit={() => openEdit(product)} onDelete={() => handleDelete(product)} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => { setModal(null); setEditing(null); }}
        title={modal === "edit" ? "Edit product" : "New product"}
      >
        <ProductForm
          initial={editing ?? undefined}
          loading={saveMutation.isPending}
          onSubmit={(values, image) =>
            saveMutation.mutateAsync({ values, image, productId: editing?.id })
          }
        />
      </Modal>
    </div>
  );
}
