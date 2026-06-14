export type FormEntityType =
  | "patient"
  | "treatment_session"
  | "appointment"
  | "product"
  | "payment"
  | "document";

export type FormFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldDefinition {
  uuid: string;
  entity_type: FormEntityType;
  field_key: string;
  label: string;
  field_type: FormFieldType;
  options: FormFieldOption[];
  is_required: boolean;
  is_system: boolean;
  maps_to_column: string | null;
  sort_order: number;
  is_active: boolean;
}

export type CustomFields = Record<string, string | boolean | number | null | undefined>;
