"use client";

import { useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api";
import { touchActivity } from "@/lib/auth-token";
import { normalizeModuleConfig } from "@/lib/modules";
import { useSettingsStore, type AppSettings } from "@/stores/settings-store";

type PublicSettingsResponse = AppSettings & {
  modules?: AppSettings["modules"];
  platform?: AppSettings["platform"];
};

/** Loads public app settings and tracks user activity for idle logout. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const setSettings = useSettingsStore((s) => s.setSettings);

  useEffect(() => {
    const load = () => {
      axios
        .get<{ data: PublicSettingsResponse }>(`${getApiBaseUrl()}/api/v1/settings/public`, {
          withCredentials: false,
        })
        .then((res) => {
          const data = res.data.data;
          setSettings({
            app_name: data.app_name,
            app_tagline: data.app_tagline,
            session_idle_minutes: data.session_idle_minutes,
            modules: normalizeModuleConfig(data.modules),
            platform: data.platform,
          });
        })
        .catch(() => {
          /* keep last known settings */
        });
    };

    load();

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    const interval = window.setInterval(load, 60_000);

    const onActivity = () => touchActivity();
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [setSettings]);

  return <>{children}</>;
}
