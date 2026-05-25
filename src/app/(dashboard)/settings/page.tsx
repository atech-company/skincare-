"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p className="flex items-center gap-2">
            <strong>Roles:</strong>{" "}
            {(Array.isArray(user?.roles) ? user.roles : []).map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Clinic</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-500">
          Configure clinic branding, notification preferences, and storage in production via .env
        </CardContent>
      </Card>
    </div>
  );
}
