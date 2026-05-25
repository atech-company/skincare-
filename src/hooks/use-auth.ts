"use client";

import { getStoredToken } from "@/lib/auth-token";
import { useAuthStore } from "@/stores/auth-store";

/** Auth state from global store (populated once by AuthProvider). */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const hasToken = Boolean(token ?? (typeof window !== "undefined" ? getStoredToken() : null));

  return {
    user,
    token,
    hasToken,
    isAuthenticated: hasToken && !!user,
    isReady: isInitialized,
    isLoading: !isInitialized,
  };
}
