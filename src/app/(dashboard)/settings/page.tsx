"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-token";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersManagement } from "@/components/features/settings/users-management";
import { getApiErrorMessage } from "@/lib/api-errors";
import { isAdminUser, normalizeRoles } from "@/lib/auth-roles";

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const { settings, setSettings } = useSettingsStore();
  const queryClient = useQueryClient();
  const roles = normalizeRoles(user?.roles);
  const isAdmin = isAdminUser(roles);
  const [refreshingUser, setRefreshingUser] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [appName, setAppName] = useState(settings.app_name);
  const [appTagline, setAppTagline] = useState(settings.app_tagline);
  const [idleMinutes, setIdleMinutes] = useState(String(settings.session_idle_minutes));

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.email, user?.phone]);

  /** Reload roles from API (fixes empty roles after old login bundle). */
  useEffect(() => {
    if (!getStoredToken() || !user || normalizeRoles(user.roles).length > 0) return;
    let cancelled = false;
    setRefreshingUser(true);
    api
      .get<{ user: { name: string; email: string; phone?: string; roles?: unknown; uuid: string; id: number; is_active: boolean } }>(
        "/auth/user"
      )
      .then((res) => {
        if (!cancelled) {
          setUser({
            ...user,
            ...res.data.user,
            roles: normalizeRoles(res.data.user.roles),
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRefreshingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, setUser]);

  useEffect(() => {
    setAppName(settings.app_name);
    setAppTagline(settings.app_tagline);
    setIdleMinutes(String(settings.session_idle_minutes));
  }, [settings]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!getStoredToken()) {
        throw new Error("You are not signed in. Please log in again.");
      }
      const res = await api.patch("/auth/profile", {
        name,
        email,
        phone: phone || null,
      });
      return res.data.user;
    },
    onSuccess: (u) => {
      setUser({ ...u, roles: normalizeRoles(u.roles) });
      toast.success("Profile updated — use the new email on your next sign-in");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Could not update profile")),
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
      setUser({ ...data.user, roles: normalizeRoles(data.user.roles) });
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

  const resetDataMutation = useMutation({
    mutationFn: async () => {
      const confirmed = window.prompt(
        'Type RESET to permanently delete clinic data (patients, sessions, images, documents, appointments, payments, products).'
      );
      if (confirmed !== "RESET") {
        throw new Error("Reset cancelled");
      }
      const res = await api.post("/settings/reset-data");
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

  if (authLoading || refreshingUser) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-500">
        Loading account…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-amber-600">
        Session expired or not loaded. Please sign in again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-500">Account, security, and clinic preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My profile</CardTitle>
          <CardDescription>Update your name, login email, and phone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Login email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            {roles.map((r) => (
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
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}>
                {settingsMutation.isPending ? "Saving…" : "Save system settings"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => resetDataMutation.mutate()}
                disabled={resetDataMutation.isPending}
              >
                {resetDataMutation.isPending ? "Resetting…" : "Reset data"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-amber-600">Contact an admin to change system name and session time.</p>
          )}
        </CardContent>
      </Card>

      <UsersManagement currentUserUuid={user.uuid} isAdmin={isAdmin} rolesLabel={roles.join(", ") || "none"} />
    </div>
  );
}
