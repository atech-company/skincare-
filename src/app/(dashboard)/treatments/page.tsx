"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import type { TreatmentSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TreatmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const res = await api.get("/treatment-sessions");
      return unwrapList<TreatmentSession>(res.data);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Treatments</h1>
          <p className="text-slate-500">Treatment sessions & progress</p>
        </div>
        <Link href="/treatments/new">
          <Button><Plus className="h-4 w-4" /> New Session</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
