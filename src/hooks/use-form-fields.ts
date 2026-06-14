"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { FormEntityType, FormFieldDefinition } from "@/types/form-fields";

export function useFormFields(entityType: FormEntityType) {
  const { canFetch } = useAuth();

  return useQuery({
    queryKey: ["form-fields", entityType],
    queryFn: async () => {
      const res = await api.get<{ data: FormFieldDefinition[] }>("/form-fields", {
        params: { entity_type: entityType },
      });
      return res.data.data;
    },
    enabled: canFetch,
    staleTime: 60_000,
  });
}
