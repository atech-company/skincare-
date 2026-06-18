"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_MODULE_CONFIG,
  MODULE_LABELS,
  type ModuleConfig,
  type ModuleKey,
} from "@/lib/modules";
import { platformCardClass, platformPanelClass } from "@/lib/platform-styles";
import { cn } from "@/lib/utils";

const TOGGLEABLE: ModuleKey[] = (
  Object.keys(DEFAULT_MODULE_CONFIG.enabled) as ModuleKey[]
).filter((k) => k !== "dashboard");

export function ModulesManager({
  initial,
  onSave,
  saving,
  variant = "default",
}: {
  initial: ModuleConfig;
  onSave: (modules: ModuleConfig) => Promise<void>;
  saving?: boolean;
  variant?: "default" | "platform";
}) {
  const isPlatform = variant === "platform";
  const [config, setConfig] = useState<ModuleConfig>(initial);

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  const toggleEnabled = (key: ModuleKey) => {
    setConfig((c) => ({
      ...c,
      enabled: { ...c.enabled, [key]: !c.enabled[key] },
    }));
  };

  const toggleLock = (key: ModuleKey) => {
    setConfig((c) => {
      const locked = new Set(c.locked_for_non_admin);
      if (locked.has(key)) locked.delete(key);
      else locked.add(key);
      return { ...c, locked_for_non_admin: [...locked] as ModuleKey[] };
    });
  };

  return (
    <Card className={isPlatform ? platformCardClass : undefined}>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
        <CardDescription className={isPlatform ? "text-slate-400" : undefined}>
          Enable or disable clinic modules. &quot;Lock for staff&quot; hides the module from clinic
          admins and staff. Only the platform super admin can access locked modules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {TOGGLEABLE.map((key) => {
          const on = config.enabled[key];
          const locked = config.locked_for_non_admin.includes(key);
          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                isPlatform
                  ? platformPanelClass
                  : "rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              )}
            >
              <div>
                <p className="font-medium">{MODULE_LABELS[key]}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant={on ? "success" : "muted"}>{on ? "Enabled" : "Disabled"}</Badge>
                  {on && locked && <Badge variant="warning">Locked for staff</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleEnabled(key)}
                    className={cn("rounded", isPlatform ? "border-slate-600 bg-slate-900" : "border-slate-300")}
                  />
                  Enabled
                </label>
                <label className={on ? "flex items-center gap-2" : "flex items-center gap-2 opacity-40"}>
                  <input
                    type="checkbox"
                    checked={locked}
                    disabled={!on}
                    onChange={() => toggleLock(key)}
                    className={cn("rounded", isPlatform ? "border-slate-600 bg-slate-900" : "border-slate-300")}
                  />
                  Lock for staff
                </label>
              </div>
            </div>
          );
        })}
        <Button
          onClick={async () => {
            try {
              await onSave(config);
              toast.success("Module settings saved");
            } catch {
              toast.error("Could not save modules");
            }
          }}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save module settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
