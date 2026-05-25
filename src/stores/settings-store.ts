import { create } from "zustand";
import { setIdleTimeoutMinutes } from "@/lib/auth-token";

export interface AppSettings {
  app_name: string;
  app_tagline: string;
  session_idle_minutes: number;
}

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  setSettings: (settings: AppSettings) => void;
  setLoaded: (loaded: boolean) => void;
}

const defaults: AppSettings = {
  app_name: "DermaCare",
  app_tagline: "Clinic Suite",
  session_idle_minutes: 10,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaults,
  loaded: false,
  setSettings: (settings) => {
    setIdleTimeoutMinutes(settings.session_idle_minutes);
    set({ settings, loaded: true });
  },
  setLoaded: (loaded) => set({ loaded }),
}));
