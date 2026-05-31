"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/api-data";
import { confirmDelete, deleteResource } from "@/lib/crud";
import type { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CrudActions } from "@/components/shared/crud-actions";
import { DocumentForm } from "@/components/features/documents/document-form";

export default function DocumentsPage() {
  const { canFetch } = useAuth();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

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
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-slate-500">Upload and manage clinic files</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" /> Upload
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading && <p className="text-slate-500">Loading...</p>}
        {data?.map((doc) => (
          <Card key={doc.uuid}>
            <CardContent className="flex items-center gap-4 p-4">
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-4">
                <FileText className="h-8 w-8 shrink-0 text-violet-500" />
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <Badge variant="muted" className="mt-1">{doc.category}</Badge>
                </div>
              </a>
              <CrudActions onDelete={() => handleDelete(doc)} />
            </CardContent>
          </Card>
        ))}
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
