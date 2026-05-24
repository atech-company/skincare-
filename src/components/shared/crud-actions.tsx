"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CrudActions({
  onEdit,
  onDelete,
  deleteLabel = "Delete",
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      {onEdit && (
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      )}
      {onDelete && (
        <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> {deleteLabel}
        </Button>
      )}
    </div>
  );
}
