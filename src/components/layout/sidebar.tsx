"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  Stethoscope,
  Timeline,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { useSettingsStore } from "@/stores/settings-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/patients/new", label: "Intake Form", icon: UserPlus },
  { href: "/treatments", label: "Treatments", icon: Stethoscope },
  { href: "/products", label: "Products", icon: Package },
  { href: "/timeline", label: "Timeline", icon: Timeline },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200/60 bg-white/70 backdrop-blur-xl transition-transform duration-200 dark:border-slate-700/60 dark:bg-slate-900/90",
          "w-64 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "md:w-[72px]"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/60 px-4 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{settings.app_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{settings.app_tagline}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active =
              item.href === "/patients"
                ? pathname === "/patients"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} prefetch onClick={onCloseMobile}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-gradient-to-r from-violet-600/10 to-indigo-600/10 text-violet-700 dark:text-violet-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-violet-600")} />
                  {!sidebarCollapsed && item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggleSidebar}
          className="m-3 hidden items-center justify-center rounded-xl border border-slate-200/80 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 md:flex"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", sidebarCollapsed && "rotate-180")} />
        </button>
      </aside>
    </>
  );
}
