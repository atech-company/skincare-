const TOKEN_KEY = "dermacare_api_token";
const ACTIVITY_KEY = "dermacare_last_activity";
const IDLE_MINUTES_KEY = "dermacare_idle_minutes";

const DEFAULT_IDLE_MINUTES = 10;

export function getIdleTimeoutMs(): number {
  if (typeof window === "undefined") return DEFAULT_IDLE_MINUTES * 60 * 1000;
  const stored = localStorage.getItem(IDLE_MINUTES_KEY);
  const minutes = stored ? parseInt(stored, 10) : DEFAULT_IDLE_MINUTES;
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_IDLE_MINUTES) * 60 * 1000;
}

export function setIdleTimeoutMinutes(minutes: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IDLE_MINUTES_KEY, String(minutes));
}

export function touchActivity(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function isIdleExpired(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  const last = localStorage.getItem(ACTIVITY_KEY);
  if (!last) return false;

  return Date.now() - parseInt(last, 10) > getIdleTimeoutMs();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  if (isIdleExpired()) {
    clearSession();
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    touchActivity();
  } else {
    clearSession();
  }
}
