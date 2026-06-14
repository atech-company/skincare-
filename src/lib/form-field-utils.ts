export function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "field";
}

export function initFormState(
  definitions: { field_key: string; maps_to_column: string | null }[],
  entity?: Record<string, unknown> | null
): { values: Record<string, string>; customFields: Record<string, string> } {
  const customFields: Record<string, string> = {
    ...Object.fromEntries(
      
      Object.entries((entity?.custom_fields as Record<string, unknown>) ?? {}).map(([k, v]) => [
        k,
        v == null ? "" : String(v),
      ])
    ),
  };

  const values: Record<string, string> = {};

  for (const def of definitions) {
    if (def.maps_to_column && entity) {
      const raw = entity[def.maps_to_column] ?? entity[def.field_key];
      values[def.field_key] = raw == null ? "" : String(raw);
    } else if (!def.maps_to_column) {
      values[def.field_key] = customFields[def.field_key] ?? "";
      delete customFields[def.field_key];
    } else {
      values[def.field_key] = "";
    }
  }

  return { values, customFields };
}

export function buildFormPayload(
  definitions: { field_key: string; maps_to_column: string | null; field_type: string }[],
  values: Record<string, string>,
  customFields: Record<string, string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const mergedCustom: Record<string, string | boolean> = { ...customFields };

  for (const def of definitions) {
    const raw = values[def.field_key];
    if (raw === "" || raw === undefined) continue;

    if (def.maps_to_column) {
      payload[def.maps_to_column] =
        def.field_type === "number" ? parseFloat(raw) || 0 : def.field_type === "checkbox" ? raw === "true" : raw;
    } else {
      mergedCustom[def.field_key] = raw;
    }
  }

  const cleanedCustom = Object.fromEntries(
    Object.entries(mergedCustom).filter(([, v]) => v !== "" && v != null)
  );

  if (Object.keys(cleanedCustom).length > 0) {
    payload.custom_fields = cleanedCustom;
  }

  return payload;
}
