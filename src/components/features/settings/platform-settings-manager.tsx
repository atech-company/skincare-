"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { platformCardClass, platformMutedTextClass } from "@/lib/platform-styles";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ClinicSettings = {
  app_name: string;
  app_tagline: string;
  session_idle_minutes: number;
  low_stock_alert_email?: string;
};

export function PlatformSettingsManager() {
  const queryClient = useQueryClient();
  const setSettings = useSettingsStore((s) => s.setSettings);
  const currentSettings = useSettingsStore((s) => s.settings);

  const [appName, setAppName] = useState(currentSettings.app_name);
  const [appTagline, setAppTagline] = useState(currentSettings.app_tagline);
  const [idleMinutes, setIdleMinutes] = useState(String(currentSettings.session_idle_minutes));
  const [alertEmail, setAlertEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "settings"],
    queryFn: async () => {
      const res = await api.get<{ data: ClinicSettings }>("/platform/settings");
      return res.data.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setAppName(data.app_name);
    setAppTagline(data.app_tagline);
    setIdleMinutes(String(data.session_idle_minutes));
    setAlertEmail(data.low_stock_alert_email ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/platform/settings", {
        app_name: appName,
        app_tagline: appTagline,
        session_idle_minutes: parseInt(idleMinutes, 10) || 10,
        low_stock_alert_email: alertEmail || null,
      });
      return res.data.data;
    },
    onSuccess: (saved) => {
      setSettings({
        ...currentSettings,
        app_name: saved.app_name,
        app_tagline: saved.app_tagline,
        session_idle_minutes: saved.session_idle_minutes,
      });
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      toast.success("Site settings saved");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Could not save settings")),
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/platform/scan-low-stock");
      return res.data;
    },
    onSuccess: (data) => toast.success(data.message ?? "Low-stock scan complete"),
    onError: (err) => toast.error(getApiErrorMessage(err, "Scan failed")),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const confirmed = window.prompt(
        "Type RESET to permanently delete all clinic data (patients, sessions, images, documents, appointments, payments, products)."
      );
      if (confirmed !== "RESET") {
        throw new Error("Reset cancelled");
      }
      const res = await api.post("/platform/reset-data");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Clinic data reset completed");
    },
    onError: (err: Error) => {
      if (err.message === "Reset cancelled") return;
      toast.error(getApiErrorMessage(err, "Could not reset data"));
    },
  });

  return (
    <Card className={platformCardClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <Settings2 className="h-4 w-4 text-violet-400" />
          Site settings
        </CardTitle>
        <CardDescription className={platformMutedTextClass}>
          Control clinic branding, session timeout, and inventory alerts across the entire site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className={`text-sm ${platformMutedTextClass}`}>Loading settings…</p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">System name</label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Tagline</label>
              <Input value={appTagline} onChange={(e) => setAppTagline(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Auto logout after inactivity (minutes)
              </label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(e.target.value)}
              />
              <p className={`mt-1 text-xs ${platformMutedTextClass}`}>
                Applies to all users. Closing the tab does not log out until this idle time passes.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Low-stock alert email (optional)
              </label>
              <Input
                type="email"
                placeholder="extra@clinic.com — admins also receive alerts"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
              />
              <p className={`mt-1 text-xs ${platformMutedTextClass}`}>
                Email sent when inventory runs low. In-app alerts always go to admin users.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save site settings"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                {scanMutation.isPending ? "Scanning…" : "Scan low stock now"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Resetting…" : "Reset clinic data"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
