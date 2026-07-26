import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
   }).format(amount);
} 

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(time?: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

/** Date with optional session time, e.g. "Jul 26, 2026 · 09:30" */
export function formatDateTime(date?: string | null, time?: string | null) {
  if (!date) return "";
  const d = formatDate(date);
  const t = formatTime(time);
  return t ? `${d} · ${t}` : d;
}
