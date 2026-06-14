"use client";

import { useAuth } from "@/hooks/use-auth";
import { normalizeRoles } from "@/lib/auth-roles";
import {
  canUseModule,
  isModuleLockedForUser,
  isModuleVisible,
  type ModuleKey,
} from "@/lib/modules";
import { useSettingsStore } from "@/stores/settings-store";

export function useModuleAccess(module: ModuleKey) {
  const { user } = useAuth();
  const modules = useSettingsStore((s) => s.modules);
  const roles = normalizeRoles(user?.roles);

  return {
    roles,
    enabled: modules.enabled[module],
    visible: isModuleVisible(module, modules),
    locked: isModuleLockedForUser(module, modules),
    canInteract: canUseModule(module, modules),
  };
}
