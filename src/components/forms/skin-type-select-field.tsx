"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, extractApiError } from "@/lib/api";
import { slugifyFieldKey } from "@/lib/form-field-utils";
import { optionClass, selectClass } from "@/lib/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormFieldDefinition, FormFieldOption } from "@/types/form-fields";

const DEFAULT_SKIN_TYPES = new Set(["normal", "dry", "oily", "combination", "sensitive"]);

export function SkinTypeSelectField({
  def,
  value,
  onChange,
}: {
  def: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
}) {
  const queryClient = useQueryClient();
  const baseOptions = def.options ?? [];
  const trimmed = value.trim();
  const hasValue = baseOptions.some((o) => o.value === trimmed);
  const orphanOption =
    trimmed && !hasValue ? [{ value: trimmed, label: trimmed.replace(/_/g, " ") }] : [];
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingValue, setDeletingValue] = useState<string | null>(null);

  const customOptions = baseOptions.filter((o) => !DEFAULT_SKIN_TYPES.has(o.value));

  const options = [...baseOptions, ...orphanOption];

  const refreshOptions = () => {
    queryClient.invalidateQueries({ queryKey: ["form-fields", "patient"] });
  };

  const pickAddedOption = (list: FormFieldOption[], label: string): FormFieldOption | undefined => {
    const slug = slugifyFieldKey(label);
    return (
      list.find((o) => o.value === slug) ??
      list.find((o) => o.label.toLowerCase() === label.toLowerCase()) ??
      list[list.length - 1]
    );
  };

  const addOption = async () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Enter a skin type name");
      return;
    }

    const existing = options.find(
      (o) => o.value === slugifyFieldKey(label) || o.label.toLowerCase() === label.toLowerCase(),
    );
    if (existing) {
      onChange(existing.value);
      setNewLabel("");
      toast.message("Already in the list — selected");
      return;
    }

    setAdding(true);
    try {
      const res = await api.post<{ data: FormFieldOption[] }>("/patient-skin-type-options", { label });
      refreshOptions();
      const added = pickAddedOption(res.data.data, label);
      if (added) onChange(added.value);
      setNewLabel("");
      toast.success(`"${label}" added to skin types`);
    } catch (err) {
      toast.error(extractApiError(err, "Could not add skin type"));
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async () => {
    if (!editingValue) return;
    const label = editLabel.trim();
    if (!label) {
      toast.error("Label is required");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.put<{ data: FormFieldOption[] }>(
        `/patient-skin-type-options/${encodeURIComponent(editingValue)}`,
        { label },
      );
      refreshOptions();
      const updated = res.data.data.find((o) => o.label === label);
      if (value === editingValue && updated) onChange(updated.value);
      setEditingValue(null);
      setEditLabel("");
      toast.success("Skin type updated");
    } catch (err) {
      toast.error(extractApiError(err, "Could not update skin type"));
    } finally {
      setSavingEdit(false);
    }
  };

  const removeOption = async (optionValue: string) => {
    setDeletingValue(optionValue);
    try {
      await api.delete(`/patient-skin-type-options/${encodeURIComponent(optionValue)}`);
      refreshOptions();
      if (value === optionValue) onChange("");
      toast.success("Skin type removed from list");
    } catch (err) {
      toast.error(extractApiError(err, "Could not remove skin type"));
    } finally {
      setDeletingValue(null);
    }
  };

  return (
    <div className="space-y-3">
      <select
        className={selectClass}
        value={trimmed}
        onChange={(e) => onChange(e.target.value)}
        required={def.is_required && !trimmed}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Type new skin type and add to list"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addOption();
            }
          }}
        />
        <Button type="button" variant="secondary" disabled={adding} onClick={() => void addOption()}>
          <Plus className="h-4 w-4" />
          {adding ? "Adding…" : "Add"}
        </Button>
      </div>

      {customOptions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-dashed border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500">Custom skin types — edit or remove</p>
          <ul className="space-y-2">
            {customOptions.map((opt) => (
              <li
                key={opt.value}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
              >
                {editingValue === opt.value ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="min-w-[10rem] flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveEdit();
                        }
                        if (e.key === "Escape") {
                          setEditingValue(null);
                          setEditLabel("");
                        }
                      }}
                    />
                    <Button type="button" size="sm" disabled={savingEdit} onClick={() => void saveEdit()}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingValue(null);
                        setEditLabel("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="font-medium text-left hover:text-violet-600"
                      onClick={() => onChange(opt.value)}
                    >
                      {opt.label}
                    </button>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${opt.label}`}
                        onClick={() => {
                          setEditingValue(opt.value);
                          setEditLabel(opt.label);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${opt.label}`}
                        disabled={deletingValue === opt.value}
                        onClick={() => void removeOption(opt.value)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
