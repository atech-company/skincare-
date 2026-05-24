import { toast } from "sonner";
import { api } from "@/lib/api";

export async function confirmDelete(message: string): Promise<boolean> {
  return window.confirm(message);
}

export async function deleteResource(
  url: string,
  { successMessage = "Deleted", errorMessage = "Delete failed" }: { successMessage?: string; errorMessage?: string } = {}
): Promise<boolean> {
  try {
    await api.delete(url);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error(errorMessage);
    return false;
  }
}
