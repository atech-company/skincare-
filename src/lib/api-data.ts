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
export function normalizeDashboard<T extends Record<string, unknown>>(stats: T): T {
  const listKeys = ["revenue_chart", "recent_activities", "top_products", "recent_uploads"] as const;
  const next = { ...stats } as T;

  for (const key of listKeys) {
    const value = stats[key];
    (next as Record<string, unknown>)[key] = Array.isArray(value) ? value : [];
  }

  return next;
}
