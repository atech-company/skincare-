import axios, { type AxiosInstance } from "axios";
import { getStoredToken, isIdleExpired, touchActivity } from "@/lib/auth-token";
import { useAuthStore } from "@/stores/auth-store";

/** API origin without trailing slash (avoids `//api/v1` when env ends with `/`). */
export const getApiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const API_URL = getApiBaseUrl();

function attachAuthInterceptor(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    if (isIdleExpired()) {
      return Promise.reject(new Error("SESSION_IDLE_EXPIRED"));
    }
    const token = getStoredToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
      touchActivity();
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      touchActivity();
      return response;
    },
    (error) => {
      if (error?.response?.status === 401) {
        useAuthStore.getState().clearAuth();
      }
      return Promise.reject(error);
    }
  );
}

const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
} as const;

/** API client — Sanctum bearer token (works across skincare.* / adminskincare.*). */
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: defaultHeaders,
});

attachAuthInterceptor(api);

/** No-op: cookie/CSRF not used in production cross-subdomain setup. */
export async function ensureCsrf(): Promise<void> {}

export const mediaUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_URL}/storage/${path.replace(/^\//, "")}`;
};
