"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User } from "lucide-react";
import { api } from "@/lib/api";
import type { Patient } from "@/types";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

export function PatientSearchSelect({
  selected,
  onSelect,
}: {
  selected: Patient | null;
  onSelect: (patient: Patient | null) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["patients-search", debounced],
    queryFn: async () => {
      const res = await api.get<{ data: Patient[] }>("/patients", {
        params: { search: debounced, per_page: 8 },
      });
      return res.data.data;
    },
    enabled: debounced.length >= 1 && !selected,
    staleTime: 30 * 1000,
  });

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{selected.full_name}</p>
            <p className="text-sm text-slate-500">
              {selected.phone}
              {selected.skin_type && ` · ${selected.skin_type} skin`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setSearch("");
          }}
          className="text-sm text-violet-600 hover:underline"
        >
          Change patient
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search patient by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading && <p className="text-sm text-slate-500">Searching...</p>}
      {data && data.length > 0 && (
        <ul className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {data.map((p) => (
            <li key={p.uuid}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <User className="h-4 w-4 text-violet-500" />
                <span>
                  <span className="font-medium">{p.full_name}</span>
                  <span className="ml-2 text-slate-500">{p.phone}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {debounced.length >= 1 && !isLoading && data?.length === 0 && (
        <p className="text-sm text-slate-500">No patients found.</p>
      )}
    </div>
  );
}
