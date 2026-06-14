"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Shield, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdminUser, normalizeRoles } from "@/lib/auth-roles";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ModulesManager } from "@/components/features/settings/modules-manager";
import { PlatformSettingsManager } from "@/components/features/settings/platform-settings-manager";
import { ReportsManager } from "@/components/features/settings/reports-manager";
import { UsersManagement } from "@/components/features/settings/users-management";
import { normalizeModuleConfig, type ModuleConfig } from "@/lib/modules";
import { platformCardClass } from "@/lib/platform-styles";
import { useSettingsStore } from "@/stores/settings-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PlatformData = {
  platform: { site_enabled: boolean; maintenance_message: string };
  modules: ModuleConfig;
};

export default function PlatformConsolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading, isAuthenticated } = useAuth();
  const setPlatform = useSettingsStore((s) => s.setPlatform);
  const setModules = useSettingsStore((s) => s.setModules);
  const roles = normalizeRoles(user?.roles);
  const isSuperAdmin = isSuperAdminUser(roles);

  const [siteEnabled, setSiteEnabled] = useState(true);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(
    useSettingsStore.getState().modules
  );

  const { data, isLoading: loadingPlatform } = useQuery({
    queryKey: ["platform"],
    queryFn: async () => {
      const res = await api.get<{ data: PlatformData }>("/platform");
      return res.data.data;
    },
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (!data) return;
    setSiteEnabled(data.platform.site_enabled);
    setMaintenanceMessage(data.platform.maintenance_message);
    setModuleConfig(normalizeModuleConfig(data.modules));
  }, [data]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, isSuperAdmin, router]);

  const siteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/platform/site", {
        site_enabled: siteEnabled,
        maintenance_message: maintenanceMessage,
      });
      return res.data.data.platform;
    },
    onSuccess: (platform) => {
      setPlatform(platform);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      toast.success(platform.site_enabled ? "Site is online" : "Site is offline");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Could not update site status")),
  });

  const modulesMutation = useMutation({
    mutationFn: async (payload: Partial<ModuleConfig>) => {
      const res = await api.put("/platform/modules", payload);
      return res.data.data.modules;
    },
    onSuccess: (modules) => {
      setModules(modules);
      setModuleConfig(normalizeModuleConfig(modules));
      queryClient.invalidateQueries();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Could not save settings")),
  });

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    useAuthStore.getState().clearAuth();
    router.replace("/login");
  };

  if (isLoading || loadingPlatform || !isSuperAdmin || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading platform console…
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-400">Platform owner</p>
            <h1 className="text-lg font-semibold text-slate-50">Site control</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="warning">super_admin</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <Card className={platformCardClass}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-50">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Website on / off
            </CardTitle>
            <CardDescription className="text-slate-400">
              Turn the clinic application online or offline for all staff and clinic admins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={siteEnabled}
                onChange={(e) => setSiteEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900"
              />
              Site online
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Maintenance message
              </label>
              <Input value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} />
            </div>
            <Button
              onClick={() => siteMutation.mutate()}
              disabled={siteMutation.isPending}
              variant={siteEnabled ? "default" : "destructive"}
            >
              {siteMutation.isPending ? "Saving…" : siteEnabled ? "Save — keep online" : "Save — take offline"}
            </Button>
          </CardContent>
        </Card>

        <PlatformSettingsManager />

        <ModulesManager
          variant="platform"
          initial={moduleConfig}
          saving={modulesMutation.isPending}
          onSave={async (next) => {
            await modulesMutation.mutateAsync(next);
            toast.success("Module settings saved");
          }}
        />

        <ReportsManager
          variant="platform"
          modules={moduleConfig}
          saving={modulesMutation.isPending}
          onSave={async (reportsEnabled) => {
            await modulesMutation.mutateAsync({ reports_enabled: reportsEnabled });
          }}
        />

        <UsersManagement
          variant="platform"
          currentUserUuid={user.uuid}
          isAdmin
          rolesLabel="super_admin"
          apiBase="/platform/users"
          title="All users"
          description="View and manage every account — clinic staff and platform owners. Super admin accounts are read-only."
        />
      </main>
    </>
  );
}
