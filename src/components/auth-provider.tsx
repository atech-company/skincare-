"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { normalizeRoles } from "@/lib/auth-roles";
import { getStoredToken, isIdleExpired, touchActivity } from "@/lib/auth-token";
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
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const validatingRef = useRef(false);

  useEffect(() => {
    setToken(getStoredToken());
  }, [setToken]);

  // Route guard: check session on navigation (does not re-fetch user).
  useEffect(() => {
    if (isPublicAuthPath(pathname)) {
      if (!isInitialized) setInitialized(true);
      return;
    }

    touchActivity();
    const stored = getStoredToken();
    setToken(stored);

    if (isIdleExpired() || !stored) {
      useAuthStore.getState().clearAuth();
      setInitialized(true);
      router.replace("/login");
    }
  }, [pathname, router, setInitialized, setToken, isInitialized]);

  // Bootstrap user once per token — fetch is not cancelled on route changes.
  useEffect(() => {
    if (isPublicAuthPath(pathname)) return;

    if (user) {
      if (!isInitialized) setInitialized(true);
      return;
    }

    if (!token) {
      if (!isInitialized) setInitialized(true);
      return;
    }

    if (validatingRef.current) return;
    validatingRef.current = true;

    (async () => {
      try {
        const nextUser = await fetchCurrentUser();
        setUser(nextUser);
      } catch (err) {
        const status = (err as AxiosError)?.response?.status;
        if (status === 401) {
          useAuthStore.getState().clearAuth();
          router.replace("/login");
        }
      } finally {
        validatingRef.current = false;
        setInitialized(true);
      }
    })();
  }, [pathname, token, user, isInitialized, router, setUser, setInitialized]);

  return <>{children}</>;
}
