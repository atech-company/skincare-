import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-token";

export type ExportFormat = "pdf" | "csv";
export type ExportPaper = "a4" | "receipt";

type FetchExportOptions = {
  format?: ExportFormat;
  paper?: ExportPaper;
  params?: Record<string, string | undefined>;
  filename?: string;
  inline?: boolean;
};

async function fetchExportBlob(path: string, options: FetchExportOptions = {}): Promise<Blob> {
  const token = getStoredToken();
  const url = new URL(`${getApiBaseUrl()}/api/v1/${path.replace(/^\//, "")}`);
  const format = options.format ?? "pdf";

  if (path.startsWith("reports/")) {
    url.searchParams.set("format", format);
  }
  if (options.paper) {
    url.searchParams.set("paper", options.paper);
  }
  if (options.inline) {
    url.searchParams.set("inline", "1");
  }
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }

  const accept =
    format === "csv" ? "text/csv" : "application/pdf";

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      Accept: accept,
    },
  });

  if (!res.ok) {
    throw new Error("Export failed");
  }

  return res.blob();
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadReport(
  report:
    | "payments"
    | "inventory"
    | "product-sales"
    | "balances"
    | "patients"
    | "treatment-sessions"
    | "appointments",
  format: ExportFormat,
  params?: Record<string, string | undefined>
): Promise<void> {
  const blob = await fetchExportBlob(`reports/${report}`, { format, params });
  const ext = format === "pdf" ? "pdf" : "csv";
  triggerDownload(blob, `${report}-report.${ext}`);
}

export async function downloadExport(
  path: string,
  options: FetchExportOptions = {}
): Promise<void> {
  const blob = await fetchExportBlob(path, options);
  const ext = options.format === "csv" ? "csv" : "pdf";
  const suffix = options.paper === "receipt" ? "-receipt" : "";
  const filename = options.filename ?? `export${suffix}.${ext}`;
  triggerDownload(blob, filename.includes(".") ? filename : `${filename}.${ext}`);
}

export async function printExport(
  path: string,
  options: Omit<FetchExportOptions, "inline"> = {}
): Promise<void> {
  const blob = await fetchExportBlob(path, { ...options, format: "pdf", inline: true });
  const objectUrl = URL.createObjectURL(blob);
  const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Pop-up blocked — allow pop-ups to print");
  }
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  });
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
