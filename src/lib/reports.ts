import type { ModuleConfig, ModuleKey } from "@/lib/modules";

export type ReportKey =
  | "payments"
  | "balances"
  | "inventory"
  | "product-sales"
  | "patients"
  | "treatment-sessions"
  | "appointments";

export const REPORT_KEYS: ReportKey[] = [
  "payments",
  "balances",
  "inventory",
  "product-sales",
  "patients",
  "treatment-sessions",
  "appointments",
];

export const DEFAULT_REPORTS_ENABLED: Record<ReportKey, boolean> = {
  payments: true,
  balances: true,
  inventory: true,
  "product-sales": true,
  patients: true,
  "treatment-sessions": true,
  appointments: true,
};

export const REPORT_LABELS: Record<ReportKey, string> = {
  payments: "Payments report",
  balances: "Outstanding balances",
  inventory: "Inventory report",
  "product-sales": "Product sales",
  patients: "Patients list",
  "treatment-sessions": "Treatment sessions",
  appointments: "Appointments schedule",
};

export const REPORT_DESCRIPTIONS: Record<ReportKey, string> = {
  payments: "All payments with patient, amount, method, and status.",
  balances: "Patients with unpaid or partially paid balances.",
  inventory: "Stock levels, purchase and selling prices.",
  "product-sales": "Products sold during treatments with quantities and totals.",
  patients: "All patients with contact and skin profile info.",
  "treatment-sessions": "Sessions with patient, treatment name, status, and totals.",
  appointments: "Booked appointments with date, time, and status.",
};

/** Module required for a report export to work. */
export const REPORT_MODULE_DEPS: Record<ReportKey, ModuleKey> = {
  payments: "payments",
  balances: "payments",
  inventory: "products",
  "product-sales": "products",
  patients: "patients",
  "treatment-sessions": "treatments",
  appointments: "appointments",
};

export function normalizeReportsEnabled(
  raw?: Partial<Record<ReportKey, boolean>> | null
): Record<ReportKey, boolean> {
  const out = { ...DEFAULT_REPORTS_ENABLED };
  if (raw) {
    REPORT_KEYS.forEach((key) => {
      if (typeof raw[key] === "boolean") {
        out[key] = raw[key]!;
      }
    });
  }
  return out;
}

export function isReportEnabled(report: ReportKey, modules: ModuleConfig): boolean {
  if (!modules.enabled.reports) return false;
  if (!modules.reports_enabled[report]) return false;
  const dep = REPORT_MODULE_DEPS[report];
  return modules.enabled[dep];
}

export const CLINIC_REPORTS = REPORT_KEYS.map((id) => ({
  id,
  title: REPORT_LABELS[id],
  description: REPORT_DESCRIPTIONS[id],
}));
