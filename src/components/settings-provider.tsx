"use client";

import { useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api";
import { touchActivity } from "@/lib/auth-token";
import { useSettingsStore, type AppSettings } from "@/stores/settings-store";

/** Loads public app settings and tracks user activity for idle logout. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const setSettings = useSettingsStore((s) => s.setSettings);

  useEffect(() => {
    axios
      .get<{ data: AppSettings }>(`${getApiBaseUrl()}/api/v1/settings/public`, {
        withCredentials: false,
      })
      .then((res) => setSettings(res.data.data))
      .catch(() => setSettings(useSettingsStore.getState().settings));

    const onActivity = () => touchActivity();
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const onVisible = () => {
      if (document.visibilityState === "visible") touchActivity();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setSettings]);

  return <>{children}</>;
}
