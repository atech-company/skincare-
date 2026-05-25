"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const { settings, setSettings } = useSettingsStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.roles?.includes("admin");

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [appName, setAppName] = useState(settings.app_name);
  const [appTagline, setAppTagline] = useState(settings.app_tagline);
  const [idleMinutes, setIdleMinutes] = useState(String(settings.session_idle_minutes));

  useEffect(() => {
    setAppName(settings.app_name);
    setAppTagline(settings.app_tagline);
    setIdleMinutes(String(settings.session_idle_minutes));
  }, [settings]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch("/auth/profile", { name, phone: phone || null });
      return res.data.user;
    },
    onSuccess: (u) => {
      setUser({ ...u, roles: Array.isArray(u.roles) ? u.roles : [] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Could not update profile"),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const res = await api.post("/auth/change-password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setToken(data.token);
      setUser({ ...data.user, roles: Array.isArray(data.user.roles) ? data.user.roles : [] });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    },
    onError: (err: Error & { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const msg =
        err.message === "Passwords do not match"
          ? err.message
          : err.response?.data?.errors?.current_password?.[0] ??
            err.response?.data?.errors?.password?.[0] ??
            err.response?.data?.message ??
            "Could not change password";
      toast.error(msg);
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/settings", {
        app_name: appName,
        app_tagline: appTagline,
        session_idle_minutes: parseInt(idleMinutes, 10) || 10,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setSettings(data);
      queryClient.invalidateQueries();
      toast.success("System settings saved");
    },
    onError: () => toast.error("Only admins can change system settings"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-500">Account, security, and clinic preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My profile</CardTitle>
          <CardDescription>Update your display name and phone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Roles:</span>
            {(Array.isArray(user?.roles) ? user.roles : []).map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </p>
          <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
            {profileMutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Use a strong password you do not use elsewhere</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            onClick={() => passwordMutation.mutate()}
            disabled={passwordMutation.isPending || !currentPassword || !newPassword}
          >
            {passwordMutation.isPending ? "Updating…" : "Change password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System & session</CardTitle>
          <CardDescription>
            App branding and how long you stay signed in after closing the tab (same browser)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">System name</label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tagline</label>
            <Input
              value={appTagline}
              onChange={(e) => setAppTagline(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Auto logout after inactivity (minutes)
            </label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={idleMinutes}
              onChange={(e) => setIdleMinutes(e.target.value)}
              disabled={!isAdmin}
            />
            <p className="mt-1 text-xs text-slate-500">
              Closing the tab does not log you out until this idle time passes. Default: 10 minutes.
            </p>
          </div>
          {isAdmin ? (
            <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}>
              {settingsMutation.isPending ? "Saving…" : "Save system settings"}
            </Button>
          ) : (
            <p className="text-sm text-amber-600">Contact an admin to change system name and session time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
