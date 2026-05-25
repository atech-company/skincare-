import axios, { type AxiosInstance } from "axios";

/** API origin without trailing slash (avoids `//api/v1` when env ends with `/`). */
export const getApiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const API_URL = getApiBaseUrl();

/** Read Sanctum CSRF cookie (needs SESSION_DOMAIN=.syc-company.com in production). */
export function readXsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function attachXsrfInterceptor(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const token = readXsrfToken();
    if (token) {
      config.headers.set("X-XSRF-TOKEN", token);
    }
    return config;
  });
}

const defaultHeaders = {
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
} as const;

/** Axios instance for Sanctum SPA auth (cookies + CSRF). */
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    ...defaultHeaders,
    "Content-Type": "application/json",
  },
});

const sanctumClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: defaultHeaders,
});

attachXsrfInterceptor(api);
attachXsrfInterceptor(sanctumClient);

export async function ensureCsrf() {
  await sanctumClient.get("/sanctum/csrf-cookie");
  if (!readXsrfToken()) {
    throw new Error(
      "CSRF cookie not set. On production, set SESSION_DOMAIN=.syc-company.com on the API server."
    );
  }
}

export const mediaUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_URL}/storage/${path.replace(/^\//, "")}`;
};
