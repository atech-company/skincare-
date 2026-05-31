"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { downloadDocument } from "@/lib/document-utils";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import { DocumentForm } from "@/components/features/documents/document-form";
import { DocumentViewerPanel } from "@/components/features/documents/document-viewer-panel";
import { cn } from "@/lib/utils";

export default function DocumentsPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Document | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    enabled: canFetch,
    queryFn: async () => {
      const res = await api.get("/documents");
      return unwrapList<Document>(res.data);
    },
    staleTime: 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      patient,
      title,
      category,
      file,
    }: {
      patient: { uuid: string };
      title: string;
      category: string;
      file: File;
    }) => {
      const form = new FormData();
      form.append("patient_uuid", patient.uuid);
      form.append("title", title);
      form.append("category", category);
      form.append("file", file);
      await api.post("/documents", form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded");
      setUploadOpen(false);
    },
    onError: () => toast.error("Upload failed"),
  });

  const handleDelete = async (doc: Document) => {
    if (!(await confirmDelete(`Delete "${doc.title}"?`))) return;
    if (await deleteResource(`/documents/${doc.id}`)) {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (selected?.uuid === doc.uuid) setSelected(null);
    }
  };

  const handleDownload = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadDocument(doc, doc.patient_name);
      toast.success("Download started");
    } catch {
      toast.error("Could not download file");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Documents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View files on this page — select a document to preview
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" /> Upload
        </Button>
      </div>

      <div className={cn("grid gap-6", selected && "lg:grid-cols-2")}>
        <div className="space-y-3">
          {isLoading && <p className="text-slate-500 dark:text-slate-400">Loading...</p>}
          {!isLoading && !data?.length && (
            <p className="text-slate-500 dark:text-slate-400">No documents yet. Upload one to get started.</p>
          )}
          {data?.map((doc) => {
            const isActive = selected?.uuid === doc.uuid;
            return (
              <Card
                key={doc.uuid}
                className={cn(
                  "cursor-pointer transition-colors hover:border-violet-300 dark:hover:border-violet-700",
                  isActive && "border-violet-400 ring-2 ring-violet-500/20 dark:border-violet-600"
                )}
                onClick={() => setSelected(doc)}
              >
                <CardContent className="flex items-center gap-3 p-4 sm:gap-4">
                  <FileText className="h-8 w-8 shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{doc.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{doc.category.replace("_", " ")}</Badge>
                      {doc.patient_name && (
                        <span className="truncate text-sm text-slate-600 dark:text-slate-400">
                          {doc.patient_name}
                        </span>
                      )}
                    </div>
                    {doc.patient_uuid && (
                      <Link
                        href={`/patients/${doc.patient_uuid}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 inline-block text-xs text-violet-600 hover:underline dark:text-violet-400"
                      >
                        Open patient profile
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      title={doc.patient_name ? `Download (${doc.patient_name})` : "Download"}
                      onClick={(e) => void handleDownload(doc, e)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <CrudActions onDelete={() => handleDelete(doc)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selected && (
          <DocumentViewerPanel
            doc={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload document">
        <DocumentForm
          loading={uploadMutation.isPending}
          onSubmit={(v) => uploadMutation.mutateAsync(v)}
        />
      </Modal>
    </div>
  );
}
