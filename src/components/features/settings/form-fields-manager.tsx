"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { selectClass, labelClass } from "@/lib/form-styles";
import type { FormEntityType, FormFieldDefinition, FormFieldType } from "@/types/form-fields";

const FIELD_TYPES: FormFieldType[] = ["text", "textarea", "number", "date", "select", "checkbox"];

export function FormFieldsManager({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState<FormEntityType>("patient");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormFieldType>("text");
  const [required, setRequired] = useState(false);
  const [optionText, setOptionText] = useState("");

  const { data: entities } = useQuery({
    queryKey: ["form-field-entities"],
    queryFn: async () => {
      const res = await api.get<{ data: { value: FormEntityType; label: string }[] }>("/form-fields/entities");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  const { data: fields, isLoading } = useQuery({
    queryKey: ["form-fields", entityType],
    queryFn: async () => {
      const res = await api.get<{ data: FormFieldDefinition[] }>("/form-fields", {
        params: { entity_type: entityType },
      });
      return res.data.data;
    },
    enabled: isAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["form-fields"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const options =
        fieldType === "select" && optionText.trim()
          ? optionText.split("\n").map((line) => {
              const [value, optLabel] = line.split("|").map((s) => s.trim());
              return { value: value || optLabel, label: optLabel || value };
            })
          : undefined;

      await api.post("/form-fields", {
        entity_type: entityType,
        label,
        field_type: fieldType,
        is_required: required,
        options,
      });
    },
    onSuccess: () => {
      toast.success("Field added to all forms");
      setLabel("");
      setOptionText("");
      invalidate();
    },
    onError: () => toast.error("Failed to add field"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ uuid, is_active }: { uuid: string; is_active: boolean }) => {
      await api.put(`/form-fields/${uuid}`, { is_active });
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/form-fields/${uuid}`);
    },
    onSuccess: () => {
      toast.success("Field removed");
      invalidate();
    },
    onError: () => toast.error("Cannot delete system field — deactivate instead"),
  });

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dynamic form fields</CardTitle>
        <CardDescription>
          Add fields to patient, treatment, appointment, and other forms. Staff can also add one-off fields when filling forms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className={labelClass}>Form type</label>
          <select
            className={selectClass}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as FormEntityType)}
          >
            {(entities ?? []).map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>New field label</label>
            <Input placeholder="e.g. Emergency contact" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Field type</label>
            <select className={selectClass} value={fieldType} onChange={(e) => setFieldType(e.target.value as FormFieldType)}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {fieldType === "select" && (
          <div>
            <label className={labelClass}>Options (one per line, value|Label)</label>
            <textarea
              className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder={"whatsapp|WhatsApp\ninstagram|Instagram"}
              value={optionText}
              onChange={(e) => setOptionText(e.target.value)}
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required field
        </label>

        <Button
          onClick={() => createMutation.mutate()}
          disabled={!label.trim() || createMutation.isPending}
        >
          <Plus className="mr-1 h-4 w-4" />
          {createMutation.isPending ? "Adding…" : "Add field to forms"}
        </Button>

        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p className="text-sm font-medium">Current fields</p>
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {(fields ?? []).map((field) => (
            <div
              key={field.uuid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
            >
              <div>
                <span className="font-medium">{field.label}</span>
                <span className="ml-2 text-slate-500">
                  {field.field_type}
                  {field.is_system ? " · system" : " · custom"}
                  {!field.is_active && " · hidden"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ uuid: field.uuid, is_active: !field.is_active })}
                >
                  {field.is_active ? "Hide" : "Show"}
                </Button>
                {!field.is_system && (
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(field.uuid)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
