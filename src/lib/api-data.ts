import type { DashboardStats } from "@/types";
import type { PatientHistoryEvent, PatientHistoryPayload } from "@/types/patient-history";

export const EMPTY_HISTORY_SUMMARY: PatientHistoryPayload["summary"] = {
  treatments: 0,
  payments: 0,
  documents: 0,
  appointments: 0,
  products_assigned: 0,
  images: 0,
  product_sales: 0,
};

/** Timeline API: legacy events array or `{ summary, events }` (possibly nested under `data`). */
export function normalizePatientHistory(raw: unknown): PatientHistoryPayload {
  if (Array.isArray(raw)) {
    const events = raw as PatientHistoryEvent[];
    return {
      summary: {
        ...EMPTY_HISTORY_SUMMARY,
        treatments: events.filter((e) => e.type === "treatment").length,
        payments: events.filter((e) => e.type === "payment").length,
        documents: events.filter((e) => e.type === "document").length,
        appointments: events.filter((e) => e.type === "appointment").length,
        products_assigned: events.filter((e) => e.type === "product_assigned").length,
        product_sales: events.filter((e) => e.type === "product_sale").length,
      },
      events,
    };
  }

  if (!raw || typeof raw !== "object") {
    return { summary: EMPTY_HISTORY_SUMMARY, events: [] };
  }

  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.events)) {
    const partial = obj as Partial<PatientHistoryPayload>;
    return {
      summary: { ...EMPTY_HISTORY_SUMMARY, ...partial.summary },
      events: obj.events as PatientHistoryEvent[],
    };
  }

  if (obj.data !== undefined && obj.events === undefined) {
    return normalizePatientHistory(obj.data);
  }

  return { summary: EMPTY_HISTORY_SUMMARY, events: [] };
}

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

/** Ensure dashboard chart/list fields are always arrays. */
export function normalizeDashboard(stats: DashboardStats): DashboardStats {
  return {
    ...stats,
    total_outstanding: stats.total_outstanding ?? 0,
    upcoming_appointments_count: stats.upcoming_appointments_count ?? 0,
    upcoming_appointments: Array.isArray(stats.upcoming_appointments) ? stats.upcoming_appointments : [],
    low_stock_count: stats.low_stock_count ?? 0,
    low_stock_products: Array.isArray(stats.low_stock_products) ? stats.low_stock_products : [],
    product_sales_revenue_month: stats.product_sales_revenue_month ?? 0,
    recent_uploads: Array.isArray(stats.recent_uploads) ? stats.recent_uploads : [],
    top_products: Array.isArray(stats.top_products) ? stats.top_products : [],
    recent_activities: Array.isArray(stats.recent_activities) ? stats.recent_activities : [],
    revenue_chart: Array.isArray(stats.revenue_chart) ? stats.revenue_chart : [],
  };
}
