"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { normalizeDashboard } from "@/lib/api-data";
import { useUiStore } from "@/stores/ui-store";
import type { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, canFetch } = useAuth();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const queryClient = useQueryClient();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!canFetch) return;
    void queryClient.prefetchQuery({
      queryKey: ["dashboard"],
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
  }, [canFetch, queryClient]);

  if (isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
      <div
        className={cn(
          "transition-[padding] duration-200",
          sidebarCollapsed ? "md:pl-[72px]" : "md:pl-64"
        )}
      >
        <Navbar onOpenMobileMenu={() => setMobileSidebarOpen(true)} />
        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
