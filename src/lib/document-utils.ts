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
  const patientPart = patientName ? sanitizeFilenamePart(patientName) : doc.patient_name
    ? sanitizeFilenamePart(doc.patient_name)
    : null;
  const base = patientPart ? `${patientPart}-${titlePart}` : titlePart;
  return `${base}.${ext}`;
}

export function isPdfDocument(doc: Document): boolean {
  return doc.mime_type === "application/pdf" || doc.file_url.toLowerCase().includes(".pdf");
}

export function isImageDocument(doc: Document): boolean {
  return doc.mime_type.startsWith("image/");
}

/** Trigger browser download with a patient-related filename. */
export async function downloadDocument(doc: Document, patientName?: string): Promise<void> {
  const filename = getDocumentDownloadName(doc, patientName);
  const res = await fetch(doc.file_url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
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
