import type { AxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

/** First validation or message string from a failed API response. */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Request failed"
): string {
  const ax = err as AxiosError<ApiErrorBody>;
  const errors = ax.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors).flat()[0];
    if (first) return first;
  }
  if (ax.response?.data?.message) return ax.response.data.message;
  if (ax.message === "Network Error") {
    return "Cannot reach the API. Check your connection, CORS, and that you are signed in.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
