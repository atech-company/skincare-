"use client";

import { Sparkles } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MaintenancePage() {
  const { settings, platform } = useSettingsStore();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{settings.app_name}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System maintenance</CardTitle>
            <CardDescription>The clinic application is temporarily unavailable.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {platform.maintenance_message}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
