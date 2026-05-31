"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useUiStore();
  const router = useRouter();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-wrap items-center gap-2 border-b border-slate-200/60 bg-white/60 px-3 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70 sm:h-16 sm:px-4 md:gap-4 md:px-6">
      <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={onOpenMobileMenu}>
        <Menu className="h-4 w-4" />
      </Button>

      <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Search patients, treatments..." className="pl-9" />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label={mobileSearchOpen ? "Close search" : "Open search"}
          onClick={() => setMobileSearchOpen((open) => !open)}
        >
          {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-pressed={theme === "dark"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800/80">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:block">{user?.name}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {mobileSearchOpen && (
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search patients, treatments..." className="pl-9" autoFocus />
        </div>
      )}
    </header>
  );
}
