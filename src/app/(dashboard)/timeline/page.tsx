"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Patient } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

export default function TimelinePage() {
  const { data: patients } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const res = await api.get<{ data: Patient[] }>("/patients", { params: { per_page: 20 } });
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timeline</h1>
        <p className="text-slate-500">Select a patient to view their journey</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {patients?.map((p) => (
          <Link key={p.uuid} href={`/patients/${p.uuid}?tab=timeline`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <p className="font-semibold">{p.full_name}</p>
                <p className="text-sm text-slate-500">View timeline →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
