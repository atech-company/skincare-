"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import type { Patient, PaginatedMeta } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CrudActions } from "@/components/shared/crud-actions";
import {
  PatientCreateModal,
  PatientEditModal,
  deletePatient,
} from "@/components/features/patients/patient-crud-modals";
import { formatDate } from "@/lib/utils";

export default function PatientsPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["patients", debouncedSearch, page],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get<{ data: Patient[]; meta: PaginatedMeta }>("/patients", {
        params: { search: debouncedSearch || undefined, page, per_page: 10 },
      });
      return { ...res.data, data: unwrapList<Patient>(res.data) };
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Patients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, edit, or delete patients</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add patient
          </Button>
          <Link href="/patients/new" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              Full intake (treatment + files)
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {isFetching && !isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile card list */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4"><Skeleton className="h-16 w-full" /></div>
                ))
              : data?.data?.map((patient) => (
                  <div key={patient.uuid} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/patients/${patient.uuid}`} className="font-medium hover:text-violet-600 dark:hover:text-violet-300">
                          {patient.full_name}
                        </Link>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{patient.phone}</p>
                      </div>
                      {patient.skin_type && <Badge variant="muted">{patient.skin_type}</Badge>}
                    </div>
                    {patient.created_at && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(patient.created_at)}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/patients/${patient.uuid}`} className="flex-1 sm:flex-none">
                        <Button variant="secondary" size="sm" className="w-full">View</Button>
                      </Link>
                      <CrudActions
                        onEdit={() => setEditing(patient)}
                        onDelete={() => deletePatient(patient, queryClient)}
                      />
                    </div>
                  </div>
                ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Skin type</th>
                  <th className="p-4 font-medium">Created</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                    ))
                  : data?.data?.map((patient) => (
                      <tr
                        key={patient.uuid}
                        className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
                      >
                        <td className="p-4 font-medium">
                          <Link href={`/patients/${patient.uuid}`} className="hover:text-violet-600">
                            {patient.full_name}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{patient.phone}</td>
                        <td className="p-4">
                          {patient.skin_type && <Badge variant="muted">{patient.skin_type}</Badge>}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {patient.created_at && formatDate(patient.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/patients/${patient.uuid}`}>
                              <Button variant="secondary" size="sm">View</Button>
                            </Link>
                            <CrudActions
                              onEdit={() => setEditing(patient)}
                              onDelete={() => deletePatient(patient, queryClient)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!isLoading && !data?.data?.length && (
            <p className="p-8 text-center text-slate-500 dark:text-slate-400">No patients yet. Click Add patient to create one.</p>
          )}
          {data?.meta && data.meta.last_page > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-sm text-slate-500">
                Page {page} of {data.meta.last_page}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PatientCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && (
        <PatientEditModal
          patient={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
