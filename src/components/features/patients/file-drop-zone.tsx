"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AcceptMap = Record<string, string[]>;

export function FileDropZone({
  label,
  description,
  files,
  onChange,
  accept,
  multiple = true,
  variant = "image",
}: {
  label: string;
  description?: string;
  files: File[];
  onChange: (files: File[]) => void;
  accept?: AcceptMap;
  multiple?: boolean;
  variant?: "image" | "document";
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
    },
    [files, multiple, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ?? (variant === "image"
      ? { "image/*": [".jpeg", ".jpg", ".png", ".webp"] }
      : { "application/pdf": [".pdf"], "image/*": [".jpeg", ".jpg", ".png", ".webp"] }),
    multiple,
  });

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const Icon = variant === "image" ? ImageIcon : FileText;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
            : "border-slate-200 hover:border-violet-300 dark:border-slate-700"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-5 w-5 text-violet-600" />
        <p className="text-center text-sm text-slate-600">
          Drag & drop or click to upload
        </p>
      </div>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50"
            >
              <span className="flex items-center gap-2 truncate">
                <Icon className="h-4 w-4 shrink-0 text-violet-500" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-slate-400">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
