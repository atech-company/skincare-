"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";
import { SettingsProvider } from "@/components/settings-provider";
import { makeQueryClient } from "@/lib/query-client";
import { useUiStore } from "@/stores/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>{children}</AuthProvider>
      </SettingsProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
