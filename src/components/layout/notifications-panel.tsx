"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Package } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

type AppNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: { product_uuid?: string };
  read_at?: string | null;
  created_at: string;
};

export function NotificationsPanel() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<{ data: AppNotification[]; meta: { unread_count: number } }>(
        "/notifications",
        { params: { per_page: 15 } }
      );
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const unread = data?.meta?.unread_count ?? 0;
  const items = data?.data ?? [];

  const markAllRead = async () => {
    await api.post("/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[min(24rem,70vh)] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-3 py-2 dark:border-slate-700">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button type="button" className="text-xs text-violet-600 hover:underline" onClick={() => void markAllRead()}>
              Mark all read
            </button>
          )}
        </div>
        {!items.length && (
          <p className="p-4 text-center text-sm text-slate-500">No notifications yet.</p>
        )}
        {items.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="flex cursor-pointer flex-col items-start gap-1 p-3"
            onClick={() => {
              if (!n.read_at) void markRead(n.id);
            }}
          >
            <div className="flex w-full items-start gap-2">
              {n.type === "low_stock" && <Package className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${!n.read_at ? "text-slate-900 dark:text-slate-100" : "text-slate-500"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                <p className="mt-1 text-[10px] text-slate-400">{formatDate(n.created_at)}</p>
              </div>
              {!n.read_at && <Badge variant="default" className="shrink-0 text-[10px]">New</Badge>}
            </div>
            {n.type === "low_stock" && n.data?.product_uuid && (
              <Link
                href="/products"
                className="text-xs text-violet-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View products →
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
