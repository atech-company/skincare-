import { create } from "zustand";
import { clearSession, getStoredToken, setStoredToken } from "@/lib/auth-token";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? getStoredToken() : null,
  isLoading: false,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    setStoredToken(token);
    set({ token });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  clearAuth: () => {
    clearSession();
    set({ user: null, token: null });
  },
}));
