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
  avatar_url?: string;
  created_at?: string;
  last_visit?: string;
  treatment_sessions?: TreatmentSession[];
  products?: PatientProduct[];
  documents?: Document[];
  payments?: Payment[];
  appointments?: Appointment[];
}

export interface TreatmentSession {
  id: number;
  uuid: string;
  patient_id: number;
  treatment_name: string;
  diagnosis?: string;
  session_notes?: string;
  follow_up_notes?: string;
  total_price: number;
  session_date: string;
  status: string;
  doctor?: User;
  images?: TreatmentImage[];
  payments?: Payment[];
  prescribed_products?: PatientProduct[];
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
  stock_quantity: number;
  image_url?: string;
  is_active: boolean;
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
}

export interface Payment {
  id: number;
  uuid: string;
  amount: number;
  payment_method: string;
  status: string;
  reference?: string;
  notes?: string;
  paid_at?: string;
  treatment_session_id?: number;
}

export interface Appointment {
  id: number;
  uuid: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
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
  recent_uploads: TreatmentImage[];
  top_products: { product_name: string; brand?: string; usage_count: number }[];
  recent_activities: {
    id: number;
    action: string;
    description?: string;
    created_at: string;
    user?: User;
  }[];
  revenue_chart: { label: string; revenue: number }[];
}
