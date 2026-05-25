"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api, getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@dermacare.test", password: "password" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post<{ user: User; token: string }>(
        "/auth/login",
        data
      );
      setToken(res.data.token);
      setUser(res.data.user);
      setInitialized(true);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string; errors?: { email?: string[] } } } };
      const msg =
        ax.response?.data?.errors?.email?.[0] ??
        ax.response?.data?.message ??
        (ax.response?.status === 419
          ? "Session expired — refresh and try again"
          : ax.response?.status === 422
            ? "Invalid email or password"
            : `Cannot reach API at ${getApiBaseUrl()}. Check NEXT_PUBLIC_API_URL and that the server is running.`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="animate-fade-in-up w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">DermaCare</h1>
          <p className="text-sm text-slate-500">Premium clinic management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your <strong>email</strong> (not username). Demo: admin@dermacare.test / password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input placeholder="Email" type="email" {...register("email")} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div>
                <Input placeholder="Password" type="password" {...register("password")} />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-violet-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
