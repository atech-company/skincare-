"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
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

    if (user) {
      setInitialized(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<{ user: User }>("/auth/user");
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          setUser(null);
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
