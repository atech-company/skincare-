"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import type { TreatmentSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TreatmentsPage() {
  const { canFetch } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["treatments"],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get("/treatment-sessions");
      return unwrapList<TreatmentSession>(res.data);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Treatments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Treatment sessions & progress</p>
        </div>
        <Link href="/treatments/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto"><Plus className="h-4 w-4" /> New Session</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <p>Loading...</p>
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
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.diagnosis}</p>
                <p className="mt-3 font-medium text-violet-600">{formatCurrency(Number(s.total_price))}</p>
                <Link href={`/treatments/${s.uuid}`} className="mt-3 inline-block text-sm text-violet-600 hover:underline">
                  View session →
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
