"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadExport,
  downloadReport,
  printExport,
  type ExportFormat,
  type ExportPaper,
} from "@/lib/export-utils";

export type ExportPrintItem =
  | {
      type: "report";
      report:
        | "payments"
        | "inventory"
        | "product-sales"
        | "balances"
        | "patients"
        | "treatment-sessions"
        | "appointments";
      format: ExportFormat;
      label: string;
      params?: Record<string, string | undefined>;
      filename?: string;
    }
  | {
      type: "export";
      path: string;
      format?: ExportFormat;
      paper?: ExportPaper;
      label: string;
      params?: Record<string, string | undefined>;
      filename?: string;
      print?: boolean;
    };

export function ExportPrintMenu({
  items,
  label = "Export / Print",
  size = "sm",
  variant = "secondary",
}: {
  items: ExportPrintItem[];
  label?: string;
  size?: "sm" | "default";
  variant?: "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const run = async (item: ExportPrintItem, key: string) => {
    setLoadingKey(key);
    const loadingToast = toast.loading(
      item.type === "export" && item.paper === "receipt"
        ? "Generating receipt…"
        : "Preparing export…"
    );
    try {
      let successMessage = "Download started";
      if (item.type === "report") {
        await downloadReport(item.report, item.format, item.params);
      } else if (item.print) {
        await printExport(item.path, {
          paper: item.paper,
          params: item.params,
          filename: item.filename,
        });
        successMessage = "Opened print dialog";
      } else {
        await downloadExport(item.path, {
          format: item.format ?? "pdf",
          paper: item.paper,
          params: item.params,
          filename: item.filename,
        });
      }
      toast.success(successMessage, { id: loadingToast });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed", { id: loadingToast });
    } finally {
      setLoadingKey(null);
    }
  };

  const iconFor = (item: ExportPrintItem) => {
    if (item.type === "export" && item.print) return <Printer className="h-3.5 w-3.5" />;
    if (item.type === "export" && item.paper === "receipt") return <Receipt className="h-3.5 w-3.5" />;
    if (
      (item.type === "report" && item.format === "csv") ||
      (item.type === "export" && item.format === "csv")
    ) {
      return <FileSpreadsheet className="h-3.5 w-3.5" />;
    }
    return <FileText className="h-3.5 w-3.5" />;
  };

  return (
    <div className="relative">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {label}
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {items.map((item, i) => {
              const key = `${item.type}-${i}`;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loadingKey === key}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
                  onClick={() => void run(item, key)}
                >
                  {iconFor(item)}
                  {loadingKey === key ? "Please wait…" : item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Common presets for entity pages */
export function patientExportItems(patientUuid: string): ExportPrintItem[] {
  return [
    { type: "export", path: `exports/patients/${patientUuid}/summary`, label: "PDF summary (A4)", paper: "a4", filename: `patient-${patientUuid}-summary.pdf` },
    { type: "export", path: `exports/patients/${patientUuid}/statement`, label: "Account statement (A4)", paper: "a4", filename: `patient-${patientUuid}-statement.pdf` },
    { type: "export", path: `exports/patients/${patientUuid}/summary`, label: "Print summary (A4)", paper: "a4", print: true },
    { type: "export", path: `exports/patients/${patientUuid}/statement`, label: "Print statement (A4)", paper: "a4", print: true },
  ];
}

export function treatmentExportItems(sessionUuid: string): ExportPrintItem[] {
  return [
    { type: "export", path: `exports/treatment-sessions/${sessionUuid}/report`, label: "PDF report (A4)", paper: "a4", filename: `treatment-${sessionUuid}.pdf` },
    { type: "export", path: `exports/treatment-sessions/${sessionUuid}/report`, label: "Receipt (80mm PDF)", paper: "receipt", filename: `treatment-${sessionUuid}-receipt.pdf` },
    { type: "export", path: `exports/treatment-sessions/${sessionUuid}/report`, label: "Print A4", paper: "a4", print: true },
    { type: "export", path: `exports/treatment-sessions/${sessionUuid}/report`, label: "Print receipt (80mm)", paper: "receipt", print: true },
  ];
}

export function paymentInvoiceItems(patientUuid: string, paymentUuid: string): ExportPrintItem[] {
  return [
    { type: "export", path: `exports/patients/${patientUuid}/payments/${paymentUuid}/invoice`, label: "Invoice (A4 PDF)", paper: "a4", filename: `invoice-${paymentUuid}.pdf` },
    { type: "export", path: `exports/patients/${patientUuid}/payments/${paymentUuid}/invoice`, label: "Receipt (80mm PDF)", paper: "receipt", filename: `receipt-${paymentUuid}.pdf` },
    { type: "export", path: `exports/patients/${patientUuid}/payments/${paymentUuid}/invoice`, label: "Print A4", paper: "a4", print: true },
    { type: "export", path: `exports/patients/${patientUuid}/payments/${paymentUuid}/invoice`, label: "Print receipt", paper: "receipt", print: true },
  ];
}
