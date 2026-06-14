"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search } from "lucide-react";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import type { Product } from "@/types";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ProductSearchSelect({
  selected,
  onSelect,
  placeholder = "Search product by name or brand…",
  compact = false,
}: {
  selected: Product | null;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
  /** Smaller selected row for inline form lines */
  compact?: boolean;
}) {
  const { canFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(search, 250);

  const { data, isLoading } = useQuery({
    queryKey: ["products-search", debounced],
    queryFn: async () => {
      const q = debounced.trim();
      const res = await api.get("/products", {
        params: {
          search: q || undefined,
          per_page: 12,
          active_only: true,
        },
      });
      return unwrapList<Product>(res.data);
    },
    enabled: canFetch && !selected && open,
    staleTime: 30_000,
  });

  if (selected) {
    if (compact) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200/80 bg-violet-50/40 px-3 py-2 dark:border-violet-900/50 dark:bg-violet-950/25">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.product_name}</p>
            <p className="text-xs text-slate-500">
              {formatCurrency(selected.price)} · stock: {selected.stock_quantity}
              {selected.brand && ` · ${selected.brand}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setSearch("");
              setOpen(true);
            }}
            className="shrink-0 text-xs text-violet-600 hover:underline"
          >
            Change
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between rounded-2xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{selected.product_name}</p>
            <p className="text-sm text-slate-500">
              {formatCurrency(selected.price)} · stock: {selected.stock_quantity}
              {selected.brand && ` · ${selected.brand}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setSearch("");
            setOpen(true);
          }}
          className="shrink-0 text-sm text-violet-600 hover:underline"
        >
          Change product
        </button>
      </div>
    );
  }

  const showList = open && (isLoading || (data && data.length > 0) || debounced.trim().length > 0);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
      </div>
      {isLoading && open && <p className="text-xs text-slate-500">Searching products…</p>}
      {showList && data && data.length > 0 && (
        <ul className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {data.map((p) => (
            <li key={p.uuid}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p);
                  setSearch("");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
                )}
              >
                <span>
                  <span className="font-medium">{p.product_name}</span>
                  {p.brand && <span className="ml-2 text-slate-500">{p.brand}</span>}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  {formatCurrency(p.price)} · stock {p.stock_quantity}
                  {p.is_low_stock && <Badge variant="warning">Low</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !isLoading && debounced.trim().length > 0 && data?.length === 0 && (
        <p className="text-xs text-slate-500">No products found. Try another name or brand.</p>
      )}
      {open && !isLoading && !debounced.trim() && data?.length === 0 && (
        <p className="text-xs text-slate-500">Type to search, or add products under Products.</p>
      )}
    </div>
  );
}
