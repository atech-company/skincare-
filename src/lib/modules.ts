import type { LucideIcon } from "lucide-react";
import { DEFAULT_REPORTS_ENABLED, normalizeReportsEnabled, type ReportKey } from "@/lib/reports";
import {
  Calendar,
  DollarSign,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Stethoscope,
  Timeline,
  UserPlus,
  Users,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "patients"
  | "intake"
  | "treatments"
  | "products"
  | "payments"
  | "reports"
  | "timeline"
  | "documents"
  | "appointments";

export type ModuleConfig = {
  enabled: Record<ModuleKey, boolean>;
  locked_for_non_admin: ModuleKey[];
  reports_enabled: Record<ReportKey, boolean>;
};

export const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  enabled: {
    dashboard: true,
    patients: true,
    intake: true,
    treatments: true,
    products: true,
    payments: true,
    reports: true,
    timeline: true,
    documents: true,
    appointments: true,
  },
  locked_for_non_admin: ["payments"],
  reports_enabled: DEFAULT_REPORTS_ENABLED,
};

export type NavModuleItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module: ModuleKey;
  /** Match /patients only, not /patients/new */
  exact?: boolean;
};

export const NAV_MODULES: NavModuleItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/patients", label: "Patients", icon: Users, module: "patients", exact: true },
  { href: "/patients/new", label: "Intake Form", icon: UserPlus, module: "intake" },
  { href: "/treatments", label: "Treatments", icon: Stethoscope, module: "treatments" },
  { href: "/products", label: "Products", icon: Package, module: "products" },
  { href: "/payments", label: "Payments", icon: DollarSign, module: "payments" },
  { href: "/invoices", label: "Invoices", icon: Receipt, module: "payments" },
  { href: "/reports", label: "Reports", icon: FileBarChart, module: "reports" },
  { href: "/timeline", label: "Timeline", icon: Timeline, module: "timeline" },
  { href: "/documents", label: "Documents", icon: FileText, module: "documents" },
  { href: "/appointments", label: "Appointments", icon: Calendar, module: "appointments" },
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  intake: "Intake form",
  treatments: "Treatments",
  products: "Products & inventory",
  payments: "Payments & accounting",
  reports: "Reports",
  timeline: "Timeline",
  documents: "Documents",
  appointments: "Appointments",
};

export function normalizeModuleConfig(raw?: Partial<ModuleConfig> | null): ModuleConfig {
  const enabled = { ...DEFAULT_MODULE_CONFIG.enabled };
  if (raw?.enabled) {
    (Object.keys(enabled) as ModuleKey[]).forEach((key) => {
      if (typeof raw.enabled?.[key] === "boolean") {
        enabled[key] = raw.enabled[key]!;
      }
    });
  }
  enabled.dashboard = true;

  const locked =
    raw && "locked_for_non_admin" in raw
      ? (raw.locked_for_non_admin ?? []).filter((k): k is ModuleKey => k in enabled)
      : DEFAULT_MODULE_CONFIG.locked_for_non_admin.filter((k): k is ModuleKey => k in enabled);

  return {
    enabled,
    locked_for_non_admin: locked,
    reports_enabled: normalizeReportsEnabled(raw?.reports_enabled),
  };
}

export function pathToModule(pathname: string): ModuleKey | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname === "/patients/new") return "intake";
  if (pathname.startsWith("/patients")) return "patients";
  if (pathname.startsWith("/treatments")) return "treatments";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/payments")) return "payments";
  if (pathname.startsWith("/invoices")) return "payments";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/timeline")) return "timeline";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/appointments")) return "appointments";
  if (pathname.startsWith("/settings")) return null;
  return null;
}

export function isModuleLockedForUser(
  module: ModuleKey,
  config: ModuleConfig,
  roles: string[] = [],
): boolean {
  if (roles.includes("super_admin")) {
    return false;
  }
  return config.locked_for_non_admin.includes(module);
}

export function isModuleVisible(module: ModuleKey, config: ModuleConfig): boolean {
  return config.enabled[module];
}

export function canUseModule(
  module: ModuleKey,
  config: ModuleConfig,
  roles: string[] = [],
): boolean {
  if (!isModuleVisible(module, config)) return false;
  if (isModuleLockedForUser(module, config, roles)) return false;
  return true;
}
