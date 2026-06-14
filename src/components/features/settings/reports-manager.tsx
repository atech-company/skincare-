"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CLINIC_REPORTS,
  normalizeReportsEnabled,
  REPORT_MODULE_DEPS,
  type ReportKey,
} from "@/lib/reports";
import { MODULE_LABELS, type ModuleConfig } from "@/lib/modules";
import { platformCardClass, platformPanelClass } from "@/lib/platform-styles";
import { cn } from "@/lib/utils";

export function ReportsManager({
  modules,
  onSave,
  saving,
  variant = "default",
}: {
  modules: ModuleConfig;
  onSave: (reportsEnabled: ModuleConfig["reports_enabled"]) => Promise<void>;
  saving?: boolean;
  variant?: "default" | "platform";
}) {
  const isPlatform = variant === "platform";
  const [reportsEnabled, setReportsEnabled] = useState(modules.reports_enabled);

  useEffect(() => {
    setReportsEnabled(modules.reports_enabled);
  }, [modules.reports_enabled]);

  const toggle = (key: ReportKey) => {
    setReportsEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const reportsModuleOn = modules.enabled.reports;

  return (
    <Card className={isPlatform ? platformCardClass : undefined}>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription className={isPlatform ? "text-slate-400" : undefined}>
          Enable or disable individual reports inside the Reports module. Requires the Reports module
          and the related clinic module (e.g. Payments) to be on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!reportsModuleOn && (
          <p className={cn("text-sm", isPlatform ? "text-amber-400" : "text-amber-600")}>
            Turn on the Reports module above to allow any report exports.
          </p>
        )}
        {CLINIC_REPORTS.map((report) => {
          const on = reportsEnabled[report.id];
          const dep = REPORT_MODULE_DEPS[report.id];
          const depOn = modules.enabled[dep];
          const available = reportsModuleOn && depOn;

          return (
            <div
              key={report.id}
              className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                isPlatform
                  ? platformPanelClass
                  : "rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              )}
            >
              <div>
                <p className="font-medium">{report.title}</p>
                <p className={cn("mt-0.5 text-xs", isPlatform ? "text-slate-400" : "text-slate-500")}>
                  {report.description}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant={on && available ? "success" : "muted"}>
                    {on && available ? "Enabled" : "Disabled"}
                  </Badge>
                  {!depOn && (
                    <Badge variant="warning">Needs {MODULE_LABELS[dep]}</Badge>
                  )}
                </div>
              </div>
              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
                  !available && "cursor-not-allowed opacity-40"
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!available}
                  onChange={() => toggle(report.id)}
                  className={cn(
                    "rounded",
                    isPlatform ? "border-slate-600 bg-slate-900" : "border-slate-300"
                  )}
                />
                Enabled
              </label>
            </div>
          );
        })}
        <Button
          onClick={async () => {
            try {
              await onSave(normalizeReportsEnabled(reportsEnabled));
              toast.success("Report settings saved");
            } catch {
              toast.error("Could not save report settings");
            }
          }}
          disabled={saving || !reportsModuleOn}
        >
          {saving ? "Saving…" : "Save report settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
