"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  forceDark = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Portals to body — set when opened outside a `.dark` ancestor (e.g. platform console). */
  forceDark?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={cn(forceDark && "dark text-slate-100")}>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex w-full max-w-lg max-h-[min(90dvh,calc(100vh-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900",
          className
        )}
      >
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pr-2">
              <h2
                id="modal-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-50"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
          onSubmit={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}
