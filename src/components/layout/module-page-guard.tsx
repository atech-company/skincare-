"use client";

import {
  isModuleLockedForUser,
  isModuleVisible,
  MODULE_LABELS,
  pathToModule,
} from "@/lib/modules";
import { normalizeRoles } from "@/lib/auth-roles";
import { useAuth } from "@/hooks/use-auth";
import { useSettingsStore } from "@/stores/settings-store";
import { ModuleDisabledNotice, ModuleLockedOverlay } from "@/components/layout/module-locked-overlay";

export function ModulePageGuard({ children }: { children: React.ReactNode }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  return <ModulePageGuardInner pathname={pathname}>{children}</ModulePageGuardInner>;
}

/** Use in client pages with pathname from usePathname */
export function ModulePageGuardInner({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const moduleKey = pathToModule(pathname);
  const modules = useSettingsStore((s) => s.modules);
  const { user } = useAuth();
  const roles = normalizeRoles(user?.roles);

  if (!moduleKey) {
    return <>{children}</>;
  }

  if (!isModuleVisible(moduleKey, modules)) {
    return <ModuleDisabledNotice moduleLabel={MODULE_LABELS[moduleKey]} />;
  }

  if (isModuleLockedForUser(moduleKey, modules, roles)) {
    return (
      <ModuleLockedOverlay title={`${MODULE_LABELS[moduleKey]} — locked`} />
    );
  }

  return <>{children}</>;
}
