export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  roles: string[];
  is_active: boolean;
}

export interface Patient {
  id: number;
  uuid: string;
  full_name: string;
  phone: string;
  gender: string;
  dob?: string;
  address?: string;
  skin_type?: string;
  allergies?: string;
  medical_history?: string;
  notes?: string;
  custom_fields?: Record<string, string>;
  avatar_url?: string;
  created_at?: string;
  last_visit?: string;
  treatment_sessions?: TreatmentSession[];
  products?: PatientProduct[];
  documents?: Document[];
  payments?: Payment[];
  appointments?: Appointment[];
}

export interface SessionAccounting {
  treatment_amount: number;
  product_sales_amount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
}

export interface TreatmentProductSale {
  id: number;
  uuid: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at?: string;
  product?: Product;
}

export interface TreatmentSession {
  id: number;
  uuid: string;
  patient_id: number;
  patient?: Pick<Patient, "uuid" | "full_name" | "phone">;
  treatment_name: string;
  diagnosis?: string;
  session_notes?: string;
  follow_up_notes?: string;
  total_price: number;
  session_date: string;
  status: string;
  custom_fields?: Record<string, string>;
  doctor?: User;
  images?: TreatmentImage[];
  payments?: Payment[];
  prescribed_products?: PatientProduct[];
  product_sales?: TreatmentProductSale[];
  accounting?: SessionAccounting;
}

export interface TreatmentImage {
  id: number;
  uuid: string;
  type: "before" | "after" | "progress";
  file_url: string;
  thumbnail_url?: string;
  annotations?: Record<string, unknown>;
  caption?: string;
  sort_order: number;
  treatment_session_id: number;
}

export interface Product {
  id: number;
  uuid: string;
  product_name: string;
  brand?: string;
  category: string;
  description?: string;
  usage_instructions?: string;
  price: number;
  purchase_price?: number;
  stock_quantity: number;
  low_stock_threshold?: number;
  is_low_stock?: boolean;
  image_url?: string;
  is_active: boolean;
  custom_fields?: Record<string, string>;
}

export interface PatientProduct {
  id: number;
  routine_period: "morning" | "night" | "other";
  dosage_notes?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  product?: Product;
}

export interface Document {
  id: number;
  uuid: string;
  title: string;
  category: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  created_at?: string;
  patient_uuid?: string;
  patient_name?: string;
  custom_fields?: Record<string, string>;
}

export interface Payment {
  id: number;
  uuid: string;
  amount: number;
  payment_method: string;
  status: string;
  reference?: string;
  notes?: string;
  custom_fields?: Record<string, string>;
  paid_at?: string;
  treatment_session_id?: number;
  treatment_session_uuid?: string;
  patient_uuid?: string;
  patient_name?: string;
  treatment_name?: string;
}

export interface PatientBalance {
  patient_uuid: string;
  patient_name: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
}

export interface Appointment {
  id: number;
  uuid: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  custom_fields?: Record<string, string>;
  patient?: Patient;
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface DashboardStats {
  total_patients: number;
  today_sessions: number;
  revenue_this_month: number;
  pending_payments: number;
  total_outstanding?: number;
  upcoming_appointments_count?: number;
  upcoming_appointments?: Appointment[];
  low_stock_count?: number;
  low_stock_products?: {
    uuid: string;
    product_name: string;
    brand?: string;
    stock_quantity: number;
    low_stock_threshold: number;
  }[];
  product_sales_revenue_month?: number;
  recent_uploads: TreatmentImage[];
  top_products: {
    product_name: string;
    brand?: string;
    usage_count: number;
    sales_revenue?: number;
  }[];
  recent_activities: {
    id: number;
    action: string;
    description?: string;
    created_at: string;
    user?: User;
  }[];
  revenue_chart: { label: string; revenue: number }[];
}
