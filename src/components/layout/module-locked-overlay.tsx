"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModuleLockedOverlay({
  title = "Module locked",
  message = "This module is locked for your clinic. Contact the platform administrator to unlock access.",
  children,
  className,
}: {
  title?: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const notice = (
    <div className="max-w-md rounded-2xl border border-white/10 bg-black/70 p-6 text-center text-white shadow-2xl">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-white/80">{message}</p>
    </div>
  );

  if (!children) {
    return (
      <div className={cn("mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/30", className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-[420px]", className)}>
      <div className="pointer-events-none select-none blur-[2px] opacity-60" aria-hidden>
        {children}
      </div>
      <div
        className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-6 backdrop-blur-[1px]"
        role="presentation"
      >
        <div>
          {notice}
          <p className="mt-4 text-center text-xs text-white/50">Preview only — interactions are disabled</p>
        </div>
      </div>
    </div>
  );
}

export function ModuleDisabledNotice({ moduleLabel }: { moduleLabel: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">{moduleLabel} is disabled</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        This module is not enabled for your clinic. Contact the platform administrator.
      </p>
    </div>
  );
}
