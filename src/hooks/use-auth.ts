"use client";

import { useAuthStore } from "@/stores/auth-store";

/** Auth state from global store (populated once by AuthProvider). */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  return {
    user,
    isLoading: !isInitialized,
  };
}
