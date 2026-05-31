"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  downloadDocument,
  fetchDocumentBlob,
  isImageDocument,
  isPdfDocument,
} from "@/lib/document-utils";
import { formatDate } from "@/lib/utils";

export function DocumentViewerPanel({
  doc,
  patientName,
  onClose,
}: {
  doc: Document;
  patientName?: string;
  onClose?: () => void;
}) {
  const displayPatient = patientName ?? doc.patient_name;
  const canPreviewPdf = isPdfDocument(doc);
  const canPreviewImage = isImageDocument(doc);
  const canPreview = canPreviewPdf || canPreviewImage;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(canPreview);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (!canPreview) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(false);
      setPreviewUrl(null);
      try {
        const blob = await fetchDocumentBlob(doc, true);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) setPreviewError(true);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, canPreview]);

  const handleDownload = async () => {
    try {
      await downloadDocument(doc, displayPatient);
      toast.success("Download started");
    } catch {
      toast.error("Could not download file");
    }
  };

  return (
    <Card className="flex h-full min-h-[20rem] flex-col overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-slate-200/60 pb-4 dark:border-slate-700/60">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base sm:text-lg">{doc.title}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="muted">{doc.category.replace("_", " ")}</Badge>
            {displayPatient && (
              <span className="text-sm text-slate-600 dark:text-slate-400">{displayPatient}</span>
            )}
            {doc.created_at && (
              <span className="text-xs text-slate-500 dark:text-slate-500">
                {formatDate(doc.created_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="secondary" size="sm" onClick={() => void handleDownload()}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-0">
        {previewLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}
        {!previewLoading && previewError && canPreview && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Could not load preview. Try downloading the file.
            </p>
            <Button onClick={() => void handleDownload()}>
              <Download className="h-4 w-4" />
              Download{displayPatient ? ` — ${displayPatient}` : ""}
            </Button>
          </div>
        )}
        {!previewLoading && !previewError && previewUrl && canPreviewPdf && (
          <iframe
            title={doc.title}
            src={previewUrl}
            className="min-h-[16rem] w-full flex-1 border-0 bg-slate-100 dark:bg-slate-950"
          />
        )}
        {!previewLoading && !previewError && previewUrl && canPreviewImage && !canPreviewPdf && (
          <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 dark:bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={doc.title}
              className="max-h-[min(70vh,32rem)] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        )}
        {!canPreview && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <FileText className="h-12 w-12 text-violet-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Preview is not available for this file type. Use download to open it on your device.
            </p>
            <Button onClick={() => void handleDownload()}>
              <Download className="h-4 w-4" />
              Download{displayPatient ? ` — ${displayPatient}` : ""}
            </Button>
          </div>
        )}
        {displayPatient && doc.patient_uuid && (
          <div className="border-t border-slate-200/60 px-4 py-3 dark:border-slate-700/60">
            <Link
              href={`/patients/${doc.patient_uuid}?tab=documents`}
              className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              View {displayPatient}&apos;s profile →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
