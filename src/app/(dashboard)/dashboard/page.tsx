"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, ImageIcon, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { normalizeDashboard } from "@/lib/api-data";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const statCards: {
  key: keyof DashboardStats;
  label: string;
  icon: typeof Users;
  color: string;
  format?: "currency";
}[] = [
  { key: "total_patients", label: "Total Patients", icon: Users, color: "from-violet-500 to-purple-600" },
  { key: "today_sessions", label: "Today's Sessions", icon: Calendar, color: "from-indigo-500 to-blue-600" },
  { key: "revenue_this_month", label: "Revenue (Month)", icon: DollarSign, color: "from-emerald-500 to-teal-600", format: "currency" },
  { key: "pending_payments", label: "Pending Payments", icon: DollarSign, color: "from-amber-500 to-orange-600" },
];

export default function DashboardPage() {
  const { isAuthenticated, isReady } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    enabled: isReady && isAuthenticated,
    queryFn: async () => {
      const res = await api.get<{ data: DashboardStats }>("/dashboard");
      const raw = res.data.data;
      return normalizeDashboard({
        total_patients: raw?.total_patients ?? 0,
        today_sessions: raw?.today_sessions ?? 0,
        revenue_this_month: raw?.revenue_this_month ?? 0,
        pending_payments: raw?.pending_payments ?? 0,
        recent_uploads: raw?.recent_uploads ?? [],
        top_products: raw?.top_products ?? [],
        recent_activities: raw?.recent_activities ?? [],
        revenue_chart: raw?.revenue_chart ?? [],
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500">Overview of your clinic today</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value = data?.[stat.key as keyof DashboardStats];
          const display =
            stat.format === "currency" && typeof value === "number"
              ? formatCurrency(value)
              : String(value ?? "—");

          return (
              <Card key={stat.key} className="overflow-hidden">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-2xl bg-gradient-to-br ${stat.color} p-3 text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{display}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !data?.revenue_chart?.length ? (
              <p className="text-sm text-slate-500">No revenue data yet.</p>
            ) : (
              <div className="flex h-40 items-end gap-2">
                {data?.revenue_chart?.map((m) => (
                  <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-indigo-400"
                      style={{
                        height: `${Math.max(8, (m.revenue / Math.max(...(data.revenue_chart.map((c) => c.revenue) || [1]))) * 120)}px`,
                      }}
                    />
                    <span className="text-xs text-slate-500">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              : data?.recent_activities?.length
                ? data.recent_activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <Badge variant="muted">{a.action}</Badge>
                    <div className="flex-1 text-sm">
                      <p>{a.description}</p>
                      <p className="text-xs text-slate-500">{a.user?.name}</p>
                    </div>
                  </div>
                  ))
                : <p className="text-sm text-slate-500">No recent activity yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {data?.recent_uploads?.length ?? 0} images uploaded recently
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Used Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.top_products?.length ? data.top_products.map((p) => (
              <div key={p.product_name} className="flex justify-between text-sm">
                <span>{p.product_name}</span>
                <Badge>{p.usage_count}x</Badge>
              </div>
            )) : <p className="text-sm text-slate-500">No product usage data yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
