import { api } from "@/lib/api";
import type { Document } from "@/types";

/** Safe filename segment for downloads. */
export function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\s.-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "document";
}

export function getDocumentDownloadName(doc: Document, patientName?: string): string {
  const ext =
    doc.file_url.split(".").pop()?.split("?")[0]?.toLowerCase() ||
    doc.mime_type.split("/").pop() ||
    "file";
  const titlePart = sanitizeFilenamePart(doc.title);
  const patientPart = patientName
    ? sanitizeFilenamePart(patientName)
    : doc.patient_name
      ? sanitizeFilenamePart(doc.patient_name)
      : null;
  const base = patientPart ? `${patientPart}-${titlePart}` : titlePart;
  return `${base}.${ext}`;
}

function parseFilenameFromDisposition(header?: string): string | null {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* ignore */
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] ?? null;
}

/** Fetch document bytes via authenticated API (same origin as API — no storage CORS). */
export async function fetchDocumentBlob(doc: Document, inline = true): Promise<Blob> {
  const res = await api.get<Blob>(`/documents/${doc.id}/file`, {
    responseType: "blob",
    params: inline ? { inline: 1 } : undefined,
  });
  return res.data;
}

export function isPdfDocument(doc: Document): boolean {
  return doc.mime_type === "application/pdf" || doc.file_url.toLowerCase().includes(".pdf");
}

export function isImageDocument(doc: Document): boolean {
  return doc.mime_type.startsWith("image/");
}

/** Trigger browser download with a patient-related filename. */
export async function downloadDocument(doc: Document, patientName?: string): Promise<void> {
  const res = await api.get<Blob>(`/documents/${doc.id}/file`, {
    responseType: "blob",
  });

  const fromHeader = parseFilenameFromDisposition(
    res.headers["content-disposition"] as string | undefined
  );
  const filename = fromHeader ?? getDocumentDownloadName(doc, patientName);
  const blob = res.data;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
