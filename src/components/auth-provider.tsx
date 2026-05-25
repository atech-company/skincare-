"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { normalizeRoles } from "@/lib/auth-roles";
import { getStoredToken, isIdleExpired } from "@/lib/auth-token";
import { isPublicAuthPath } from "@/lib/public-routes";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<{ user: User }>("/auth/user");
  return {
    ...data.user,
    roles: normalizeRoles(data.user.roles),
  };
}

/** Restores session from bearer token; redirects to login when missing or invalid. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const validatingRef = useRef(false);

  useEffect(() => {
    setToken(getStoredToken());
  }, [setToken]);

  useEffect(() => {
    if (isPublicAuthPath(pathname)) {
      if (!isInitialized) setInitialized(true);
      return;
    }

    if (isIdleExpired()) {
      useAuthStore.getState().clearAuth();
      setInitialized(true);
      router.replace("/login");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      useAuthStore.getState().clearAuth();
      setInitialized(true);
      router.replace("/login");
      return;
    }

    if (user) {
      if (!isInitialized) setInitialized(true);
      return;
    }

    if (validatingRef.current) return;
    validatingRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const nextUser = await fetchCurrentUser();
        if (!cancelled) setUser(nextUser);
      } catch {
        if (!cancelled) {
          useAuthStore.getState().clearAuth();
          router.replace("/login");
        }
      } finally {
        validatingRef.current = false;
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
      validatingRef.current = false;
    };
  }, [pathname, user, isInitialized, router, setUser, setInitialized]);

  return <>{children}</>;
}
