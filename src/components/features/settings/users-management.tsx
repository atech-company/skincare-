"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { getApiErrorMessage } from "@/lib/api-errors";
import { normalizeRoles } from "@/lib/auth-roles";
import { confirmDelete } from "@/lib/crud";
import { selectClass } from "@/lib/form-styles";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";

const ROLES = ["admin", "doctor", "receptionist"] as const;

type UserForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: (typeof ROLES)[number];
  is_active: boolean;
};

const emptyForm = (): UserForm => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "receptionist",
  is_active: true,
});

export function UsersManagement({
  currentUserUuid,
  isAdmin,
  rolesLabel,
}: {
  currentUserUuid?: string;
  isAdmin: boolean;
  rolesLabel: string;
}) {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    enabled: canFetch && isAdmin,
    queryFn: async () => {
      const res = await api.get("/users");
      return unwrapList<User>(res.data).map((u) => ({
        ...u,
        roles: normalizeRoles(u.roles),
      }));
    },
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const body: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) body.password = form.password;
        const res = await api.patch(`/users/${editing.uuid}`, body);
        return res.data;
      }
      const res = await api.post("/users", {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        password: form.password,
        role: form.role,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(editing ? "User updated" : "User created");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Could not save user")),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      password: "",
      role: (u.roles?.[0] as UserForm["role"]) ?? "receptionist",
      is_active: u.is_active,
    });
    setOpen(true);
  };

  const deactivate = async (u: User) => {
    if (u.uuid === currentUserUuid) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    if (!(await confirmDelete(`Deactivate ${u.name}? They will not be able to sign in.`))) return;
    try {
      await api.delete(`/users/${u.uuid}`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not deactivate user"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Team users
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Add staff accounts and manage login emails."
              : `Only administrators can add users. Your role: ${rolesLabel}.`}
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <p className="text-sm text-amber-600">
            Sign in with an administrator account to manage team members.
          </p>
        )}
        {isAdmin && isLoading && <p className="text-sm text-slate-500">Loading users…</p>}
        {isAdmin && isError && (
          <p className="text-sm text-red-600">
            {getApiErrorMessage(error, "Could not load users")}. Check API deploy and CORS.
          </p>
        )}
        {isAdmin && (
          <div className="space-y-2">
            {users?.map((u) => (
              <div
                key={u.uuid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  <div className="mt-1 flex gap-1">
                    {(Array.isArray(u.roles) ? u.roles : []).map((r) => (
                      <Badge key={r} variant="muted">
                        {r}
                      </Badge>
                    ))}
                    {!u.is_active && <Badge>Inactive</Badge>}
                  </div>
                </div>
                <CrudActions
                  onEdit={() => openEdit(u)}
                  onDelete={() => deactivate(u)}
                  deleteLabel="Deactivate"
                />
              </div>
            ))}
            {!isLoading && !users?.length && (
              <p className="text-sm text-slate-500">No users yet. Click Add user above.</p>
            )}
          </div>
        )}
      </CardContent>

      {isAdmin && (
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={editing ? "Edit user" : "Add user"}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Full name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Login email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <select
                className={selectClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserForm["role"] })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {editing ? "New password (leave blank to keep)" : "Password"}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active (can sign in)
              </label>
            )}
            <Button
              className="w-full"
              disabled={saveMutation.isPending || !form.name || !form.email || (!editing && !form.password)}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : editing ? "Update user" : "Create user"}
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
