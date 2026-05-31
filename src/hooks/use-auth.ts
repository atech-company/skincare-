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
    /** User profile loaded and token present. */
    isAuthenticated: hasToken && !!user,
    /** Safe to fire authenticated API queries (token restored, bootstrap done). */
    canFetch: isInitialized && hasToken,
    isReady: isInitialized,
    isLoading: !isInitialized,
  };
}
