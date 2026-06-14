"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { printExport } from "@/lib/export-utils";
import { toast } from "sonner";
import { downloadReport } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { labelClass } from "@/lib/form-styles";
import { CLINIC_REPORTS, isReportEnabled, type ReportKey } from "@/lib/reports";
import { useSettingsStore } from "@/stores/settings-store";

export default function ReportsPage() {
  const modules = useSettingsStore((s) => s.modules);
  const reports = CLINIC_REPORTS.filter((r) => isReportEnabled(r.id, modules));

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const params = () => ({
    date_from: dateFrom,
    date_to: dateTo,
    status,
  });

  const handleExport = async (report: ReportKey, format: "csv" | "pdf") => {
    setLoading(`${report}-${format}`);
    try {
      await downloadReport(report, format, params());
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = async (report: ReportKey) => {
    setLoading(`${report}-print`);
    try {
      await printExport(`reports/${report}`, { params: params() });
      toast.success("Print dialog opened");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Print failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Export clinic data as PDF or Excel-compatible CSV
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No reports are enabled for your clinic. Contact the platform administrator.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date range (optional)</CardTitle>
              <CardDescription>Applies to payments and product sales reports</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div>
                <label className={labelClass}>From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Payment status</label>
                <Input
                  placeholder="paid, partial, pending..."
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loading === `${r.id}-csv`}
                    onClick={() => void handleExport(r.id, "csv")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (CSV)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loading === `${r.id}-pdf`}
                    onClick={() => void handleExport(r.id, "pdf")}
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loading === `${r.id}-print`}
                    onClick={() => void handlePrint(r.id)}
                  >
                    <Printer className="h-4 w-4" />
                    Print A4
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
