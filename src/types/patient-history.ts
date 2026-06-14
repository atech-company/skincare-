import type { TreatmentImage } from "@/types";

export type PatientHistoryEventType =
  | "registered"
  | "treatment"
  | "payment"
  | "document"
  | "appointment"
  | "product_assigned"
  | "product_sale";

export interface PatientHistoryEvent {
  id: string;
  type: PatientHistoryEventType;
  date: string;
  datetime: string;
  title: string;
  description?: string | null;
  href?: string | null;
  amount?: number | null;
  status?: string | null;
  images?: TreatmentImage[];
  items?: { product_name?: string; quantity?: number; total?: number }[];
  meta?: Record<string, unknown>;
}

export interface PatientHistorySummary {
  treatments: number;
  payments: number;
  documents: number;
  appointments: number;
  products_assigned: number;
  images: number;
  product_sales: number;
}

export interface PatientHistoryPayload {
  summary: PatientHistorySummary;
  events: PatientHistoryEvent[];
}
