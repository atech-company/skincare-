"use client";

import { type ChangeEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelClass, optionClass, selectClass, textareaClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import { slugifyFieldKey } from "@/lib/form-field-utils";
import { useFormFields } from "@/hooks/use-form-fields";
import type { FormEntityType, FormFieldDefinition } from "@/types/form-fields";

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const common = {
    value,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(e.target.value),
  };

  switch (def.field_type) {
    case "textarea":
      return <textarea {...common} className={cn(textareaClass, "min-h-[80px]")} placeholder={def.label} />;
    case "number":
      return <Input type="number" step="any" {...common} placeholder={def.label} required={def.is_required} />;
    case "date":
      return <Input type="date" {...common} required={def.is_required} />;
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          />
          {def.label}
        </label>
      );
    case "select": {
      const options = def.options ?? [];
      const inList = options.some((o) => o.value === value);
      return (
        <div className="space-y-2">
          <select
            className={selectClass}
            value={inList ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            required={def.is_required && !value}
          >
            {!def.is_required && (
              <option value="" className={optionClass}>
                —
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className={optionClass}>
                {opt.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Or type your own value"
            value={inList ? "" : value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }
    default:
      return <Input {...common} placeholder={def.label} required={def.is_required} />;
  }
}

export function DynamicFormFields({
  entityType,
  values,
  customFields,
  onValuesChange,
  onCustomFieldsChange,
  hideKeys = [],
  className,
  allowAdHoc = true,
  definitions: definitionsProp,
}: {
  entityType: FormEntityType;
  values: Record<string, string>;
  customFields: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onCustomFieldsChange: (fields: Record<string, string>) => void;
  hideKeys?: string[];
  className?: string;
  allowAdHoc?: boolean;
  /** Pass from parent to avoid duplicate API calls */
  definitions?: FormFieldDefinition[];
}) {
  const { data: fetchedFields, isLoading } = useFormFields(entityType);
  const fields = definitionsProp ?? fetchedFields;
  const visible = (fields ?? []).filter((f) => f.is_active && !hideKeys.includes(f.field_key));

  const adHocRows = Object.entries(customFields).map(([key, value]) => ({
    id: key,
    label: key.replace(/_/g, " "),
    value,
  }));

  const setValue = (key: string, val: string) => onValuesChange({ ...values, [key]: val });

  const addAdHoc = () => {
    onCustomFieldsChange({ ...customFields, [`extra_${Date.now()}`]: "" });
  };

  const updateAdHoc = (oldKey: string, label: string, value: string) => {
    const next = { ...customFields };
    delete next[oldKey];
    next[slugifyFieldKey(label || "field")] = value;
    onCustomFieldsChange(next);
  };

  const removeAdHoc = (key: string) => {
    const next = { ...customFields };
    delete next[key];
    onCustomFieldsChange(next);
  };

  if (!definitionsProp && isLoading) {
    return <p className="text-sm text-slate-500">Loading form fields…</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {visible.map((def) => (
        <div key={def.uuid} className={def.field_type === "checkbox" ? "" : "space-y-1"}>
          {def.field_type !== "checkbox" && (
            <label className={labelClass}>
              {def.label}
              {def.is_required && " *"}
            </label>
          )}
          <FieldInput def={def} value={values[def.field_key] ?? ""} onChange={(v) => setValue(def.field_key, v)} />
        </div>
      ))}

      {allowAdHoc && (
        <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Extra fields</p>
            <Button type="button" variant="secondary" size="sm" onClick={addAdHoc}>
              <Plus className="mr-1 h-4 w-4" />
              Add field
            </Button>
          </div>
          {adHocRows.length === 0 && (
            <p className="text-xs text-slate-500">Add any extra information not listed above.</p>
          )}
          {adHocRows.map((row) => (
            <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className={labelClass}>Label</label>
                <Input
                  placeholder="e.g. Referral source"
                  defaultValue={row.label}
                  onBlur={(e) => updateAdHoc(row.id, e.target.value, row.value)}
                />
              </div>
              <div className="flex-[2]">
                <label className={labelClass}>Value</label>
                <Input
                  placeholder="Enter value"
                  value={row.value}
                  onChange={(e) => updateAdHoc(row.id, row.label, e.target.value)}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAdHoc(row.id)} aria-label="Remove">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
