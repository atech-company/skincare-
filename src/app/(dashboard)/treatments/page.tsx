"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import type { TreatmentSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { selectClass, labelClass } from "@/lib/form-styles";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportPrintMenu } from "@/components/shared/export-print-menu";

export default function TreatmentsPage() {
  const { canFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["treatments", search, dateFrom, dateTo, status],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get("/treatment-sessions", {
        params: {
          search: search || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          status: status || undefined,
        },
      });
      return unwrapList<TreatmentSession>(res.data);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Treatments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Treatment sessions & product sales</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPrintMenu
            items={[
              {
                type: "report",
                report: "treatment-sessions",
                format: "pdf",
                label: "PDF (A4)",
                params: { search, date_from: dateFrom, date_to: dateTo, status },
              },
              {
                type: "report",
                report: "treatment-sessions",
                format: "csv",
                label: "Excel (CSV)",
                params: { search, date_from: dateFrom, date_to: dateTo, status },
              },
            ]}
            label="Export list"
          />
          <Link href="/treatments/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto"><Plus className="h-4 w-4" /> New Session</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search treatment or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          data?.map((s) => (
            <Card key={s.uuid} className="transition-shadow hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{s.treatment_name}</p>
                    <p className="text-sm text-slate-500">{formatDate(s.session_date)}</p>
                  </div>
                  <Badge>{s.status}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{s.diagnosis}</p>
                <p className="mt-3 font-medium text-violet-600 dark:text-violet-400">
                  {formatCurrency(Number(s.total_price))}
                </p>
                <Link href={`/treatments/${s.uuid}`} className="mt-3 inline-block text-sm text-violet-600 hover:underline dark:text-violet-400">
                  View session →
                </Link>
              </CardContent>
            </Card>
          ))
        )}
        {!isLoading && !data?.length && (
          <p className="text-slate-500">No treatments match your filters.</p>
        )}
      </div>
    </div>
  );
}
