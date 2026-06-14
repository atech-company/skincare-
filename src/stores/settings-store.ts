import { create } from "zustand";
import { setIdleTimeoutMinutes } from "@/lib/auth-token";
import { DEFAULT_MODULE_CONFIG, normalizeModuleConfig, type ModuleConfig } from "@/lib/modules";

export type PlatformConfig = {
  site_enabled: boolean;
  maintenance_message: string;
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  site_enabled: true,
  maintenance_message: "The clinic system is temporarily unavailable. Please try again later.",
};

export interface AppSettings {
  app_name: string;
  app_tagline: string;
  session_idle_minutes: number;
  modules?: ModuleConfig;
  platform?: PlatformConfig;
}

interface SettingsState {
  settings: AppSettings;
  modules: ModuleConfig;
  platform: PlatformConfig;
  loaded: boolean;
  setSettings: (settings: AppSettings) => void;
  setPlatform: (platform: PlatformConfig) => void;
  setModules: (modules: ModuleConfig) => void;
  setLoaded: (loaded: boolean) => void;
}

const defaults: AppSettings = {
  app_name: "DermaCare",
  app_tagline: "Clinic Suite",
  session_idle_minutes: 10,
};

function normalizePlatform(raw?: Partial<PlatformConfig> | null): PlatformConfig {
  return {
    site_enabled: raw?.site_enabled ?? DEFAULT_PLATFORM_CONFIG.site_enabled,
    maintenance_message:
      raw?.maintenance_message?.trim() || DEFAULT_PLATFORM_CONFIG.maintenance_message,
  };
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaults,
  modules: DEFAULT_MODULE_CONFIG,
  platform: DEFAULT_PLATFORM_CONFIG,
  loaded: false,
  setSettings: (settings) => {
    setIdleTimeoutMinutes(settings.session_idle_minutes);
    const modules = normalizeModuleConfig(settings.modules);
    const platform = normalizePlatform(settings.platform);
    set({ settings: { ...settings, modules, platform }, modules, platform, loaded: true });
  },
  setPlatform: (platform) => set({ platform: normalizePlatform(platform) }),
  setModules: (modules) => set({ modules: normalizeModuleConfig(modules) }),
  setLoaded: (loaded) => set({ loaded }),
}));
