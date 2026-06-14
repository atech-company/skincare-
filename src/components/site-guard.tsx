"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdminUser, normalizeRoles } from "@/lib/auth-roles";
import { isPlatformPath, isPublicAuthPath } from "@/lib/public-routes";
import { useSettingsStore } from "@/stores/settings-store";

/** Site offline + super-admin routing rules. */
export function SiteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isReady } = useAuth();
  const platform = useSettingsStore((s) => s.platform);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded || isPublicAuthPath(pathname)) return;

    const roles = normalizeRoles(user?.roles);
    const superAdmin = isSuperAdminUser(roles);

    if (isPlatformPath(pathname) && isReady && user && !superAdmin) {
      router.replace("/dashboard");
      return;
    }

    if (superAdmin && isReady && user && !isPlatformPath(pathname)) {
      router.replace("/platform");
      return;
    }

    if (!platform.site_enabled && isReady) {
      if (!user) {
        if (!isPlatformPath(pathname)) router.replace("/maintenance");
        return;
      }
      if (!superAdmin && pathname !== "/maintenance") {
        router.replace("/maintenance");
      }
    }
  }, [loaded, platform.site_enabled, pathname, user, isReady, router]);

  return <>{children}</>;
}
