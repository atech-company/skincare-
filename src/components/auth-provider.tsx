"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-token";
import { isPublicAuthPath } from "@/lib/public-routes";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

/** Fetches /auth/user once per app session; does not block route changes after init. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isInitialized, setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) return;

    if (isPublicAuthPath(pathname)) {
      setInitialized(true);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setInitialized(true);
      if (!isPublicAuthPath(pathname)) router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<{ user: User }>("/auth/user");
        if (!cancelled) {
          setUser({
            ...data.user,
            roles: Array.isArray(data.user.roles) ? data.user.roles : [],
          });
        }
      } catch {
        if (!cancelled) {
          useAuthStore.getState().clearAuth();
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isInitialized, user, pathname, router, setUser, setInitialized]);

  return <>{children}</>;
}
