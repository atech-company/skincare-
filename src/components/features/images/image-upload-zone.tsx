"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ImageUploadZone({
  sessionUuid,
  type,
  onUploaded,
}: {
  sessionUuid: string;
  type: "before" | "after" | "progress";
  onUploaded?: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploading(true);
      const form = new FormData();
      form.append("type", type);
      files.forEach((f) => form.append("images[]", f));
      try {
        await api.post(`/treatment-sessions/${sessionUuid}/images`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Images uploaded");
        onUploaded?.();
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [sessionUuid, type, onUploaded]
  );

  const onDrop = useCallback((accepted: File[]) => upload(accepted), [upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors",
        isDragActive ? "border-violet-500 bg-violet-50/50" : "border-slate-200 hover:border-violet-300",
        uploading && "pointer-events-none opacity-60"
      )}
    >
      <input {...getInputProps()} capture="environment" />
      <div className="flex gap-2">
        <Upload className="h-5 w-5 text-violet-600" />
        <Camera className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium">
        {uploading ? "Uploading..." : `Drop ${type} images or tap to upload`}
      </p>
      <p className="text-xs text-slate-500">JPEG, PNG, WebP — max 10MB</p>
    </div>
  );
}
