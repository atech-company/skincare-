/** Unwrap list payloads (`data`, or double-wrapped `data.data` from Laravel resources). */
export function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];

  const record = body as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data as T[];

  if (record.data && typeof record.data === "object") {
    const inner = record.data as Record<string, unknown>;
    if (Array.isArray(inner.data)) return inner.data as T[];
  }

  return [];
}

import type { DashboardStats } from "@/types";

/** Ensure dashboard chart/list fields are always arrays. */
export function normalizeDashboard(stats: DashboardStats): DashboardStats {
  return {
    ...stats,
    recent_uploads: Array.isArray(stats.recent_uploads) ? stats.recent_uploads : [],
    top_products: Array.isArray(stats.top_products) ? stats.top_products : [],
    recent_activities: Array.isArray(stats.recent_activities) ? stats.recent_activities : [],
    revenue_chart: Array.isArray(stats.revenue_chart) ? stats.revenue_chart : [],
  };
}
