"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  History,
  ImageIcon,
  List,
  Package,
  Stethoscope,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl } from "@/lib/api";
import { EMPTY_HISTORY_SUMMARY, normalizePatientHistory } from "@/lib/api-data";
import { confirmDelete, deleteResource } from "@/lib/crud";
import { downloadDocument } from "@/lib/document-utils";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { PatientHistoryEvent, PatientHistoryEventType, PatientHistoryPayload } from "@/types/patient-history";
import type { TreatmentImage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentViewerPanel } from "@/components/features/documents/document-viewer-panel";
import { PaymentForm } from "@/components/features/payments/payment-form";
import { ExportPrintMenu, invoiceExportItems, paymentInvoiceItems } from "@/components/shared/export-print-menu";
import { useModuleAccess } from "@/hooks/use-module-access";
import type { Document, Payment } from "@/types";

const TYPE_FILTERS: { key: string; label: string; types?: PatientHistoryEventType[] }[] = [
  { key: "all", label: "All types" },
  { key: "treatment", label: "Treatments", types: ["treatment"] },
  { key: "visual", label: "Photos", types: ["treatment"] },
  { key: "payment", label: "Payments", types: ["payment"] },
  { key: "document", label: "Documents", types: ["document"] },
  { key: "appointment", label: "Appointments", types: ["appointment"] },
  { key: "product", label: "Products", types: ["product_assigned", "product_sale"] },
];

const DATE_PRESETS = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "365d", label: "1 year" },
] as const;

const TYPE_ICON: Record<PatientHistoryEventType, typeof Stethoscope> = {
  registered: UserPlus,
  treatment: Stethoscope,
  payment: DollarSign,
  document: FileText,
  appointment: Calendar,
  product_assigned: Package,
  product_sale: Package,
};

const TYPE_LABEL: Record<PatientHistoryEventType, string> = {
  registered: "Registration",
  treatment: "Treatment",
  payment: "Payment",
  document: "Document",
  appointment: "Appointment",
  product_assigned: "Routine product",
  product_sale: "Product sold",
};

type DateGroup = { date: string; events: PatientHistoryEvent[] };

function metaText(meta: Record<string, unknown> | undefined, key: string): string | null {
  const v = meta?.[key];
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (v && typeof v === "object" && "value" in v && typeof (v as { value: unknown }).value === "string") {
    return (v as { value: string }).value;
  }
  return null;
}

function displayStatus(status: unknown): string | null {
  if (typeof status === "string" && status.length > 0) return status;
  if (status && typeof status === "object" && "value" in status) {
    const v = (status as { value: unknown }).value;
    return typeof v === "string" ? v : v != null ? String(v) : null;
  }
  return status != null ? String(status) : null;
}

function eventAmount(event: PatientHistoryEvent): number | null {
  if (event.amount == null) return null;
  const n = Number(event.amount);
  return Number.isFinite(n) ? n : null;
}

function metaNumber(meta: Record<string, unknown> | undefined, key: string): number | null {
  const v = meta?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function eventToDocument(
  event: PatientHistoryEvent,
  patientUuid: string,
  patientName: string,
): Document | null {
  const fileUrl = mediaUrl(metaText(event.meta, "file_url"));
  const id = metaNumber(event.meta, "document_id");
  if (!fileUrl || !id) return null;
  return {
    id,
    uuid: metaText(event.meta, "document_uuid") ?? event.id.replace(/^document-/, ""),
    title: event.title,
    category: event.description ?? "document",
    file_url: fileUrl,
    mime_type: metaText(event.meta, "mime_type") ?? "application/octet-stream",
    file_size: metaNumber(event.meta, "file_size") ?? 0,
    patient_uuid: patientUuid,
    patient_name: patientName,
    created_at: event.date,
  };
}

function eventToPayment(event: PatientHistoryEvent, patientUuid: string): Payment | null {
  const id = metaNumber(event.meta, "payment_id");
  const paymentUuid = metaText(event.meta, "payment_uuid") ?? event.id.replace(/^payment-/, "");
  const amount = eventAmount(event);
  if (!paymentUuid || amount == null) return null;

  return {
    id: id ?? 0,
    uuid: paymentUuid,
    amount,
    payment_method: metaText(event.meta, "payment_method") ?? "cash",
    status: displayStatus(event.status) ?? "paid",
    reference: metaText(event.meta, "reference") ?? undefined,
    notes: metaText(event.meta, "notes") ?? undefined,
    paid_at: metaText(event.meta, "paid_at") ?? event.date,
    treatment_session_uuid: metaText(event.meta, "treatment_session_uuid") ?? undefined,
    treatment_name: metaText(event.meta, "treatment_name") ?? undefined,
    invoice_uuid: metaText(event.meta, "invoice_uuid") ?? undefined,
    invoice_number: metaText(event.meta, "invoice_number") ?? undefined,
    patient_uuid: patientUuid,
    patient_name: undefined,
  };
}

type SelectedImage = { image: TreatmentImage; sessionHref?: string | null };

function TreatmentImageHistoryModal({
  selected,
  onClose,
  onChanged,
}: {
  selected: SelectedImage;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { image, sessionHref } = selected;
  const fullUrl = mediaUrl(image.file_url);

  const handleDelete = async () => {
    if (!(await confirmDelete("Delete this photo?"))) return;
    if (await deleteResource(`/treatment-images/${image.id}`)) {
      toast.success("Photo deleted");
      onChanged();
      onClose();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${image.type.charAt(0).toUpperCase()}${image.type.slice(1)} photo`}
      description={image.caption ?? "Treatment visual tracking"}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullUrl ?? ""}
            alt={image.type}
            className="max-h-[min(60vh,28rem)] w-auto max-w-full object-contain"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {sessionHref && (
            <Link href={sessionHref}>
              <Button type="button" variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4" />
                Manage on session
              </Button>
            </Link>
          )}
          {fullUrl && (
            <Button type="button" variant="secondary" size="sm" asChild>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                Open full size
              </a>
            </Button>
          )}
          <Button type="button" variant="destructive" size="sm" onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4" />
            Delete photo
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ClickableTreatmentImage({
  image,
  sessionHref,
  onSelect,
  className,
  width,
  height,
}: {
  image: TreatmentImage;
  sessionHref?: string | null;
  onSelect: (selected: SelectedImage) => void;
  className?: string;
  width: number;
  height: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect({ image, sessionHref })}
      className={cn(
        "relative shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:ring-slate-700",
        className,
      )}
      title={`Manage ${image.type} photo`}
    >
      <Image
        src={mediaUrl(image.thumbnail_url || image.file_url) ?? ""}
        alt={image.type}
        width={width}
        height={height}
        className="h-full w-full object-cover"
      />
      <Badge variant="muted" className="absolute bottom-1 left-1 capitalize">
        {image.type}
      </Badge>
    </button>
  );
}

function eventDateKey(date: string) {
  return date.slice(0, 10);
}

function presetDateRange(key: (typeof DATE_PRESETS)[number]["key"]): { from: string; to: string } {
  if (key === "all") return { from: "", to: "" };
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const days = key === "7d" ? 7 : key === "30d" ? 30 : key === "90d" ? 90 : 365;
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - days);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function filterByDateRange(events: PatientHistoryEvent[], from: string, to: string) {
  return events.filter((e) => {
    const d = eventDateKey(e.date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

function filterByType(events: PatientHistoryEvent[], filter: string) {
  const f = TYPE_FILTERS.find((x) => x.key === filter);
  if (!f?.types) return events;
  if (filter === "visual") {
    return events.filter((e) => e.type === "treatment" && (e.images?.length ?? 0) > 0);
  }
  return events.filter((e) => f.types!.includes(e.type));
}

function groupEventsByDate(events: PatientHistoryEvent[]): DateGroup[] {
  const map = new Map<string, PatientHistoryEvent[]>();
  for (const e of events) {
    const key = eventDateKey(e.date);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupEvents]) => ({ date, events: groupEvents }));
}

function usePatientHistory(uuid: string, enabled: boolean) {
  return useQuery({
    queryKey: ["patient-history", "v5", uuid],
    queryFn: async () => {
      const res = await api.get<{ data: unknown }>(`/patients/${uuid}/timeline`);
      return normalizePatientHistory(res.data.data);
    },
    enabled: enabled && !!uuid,
    staleTime: 60_000,
  });
}

function VisualGallery({
  events,
  onImageSelect,
}: {
  events: PatientHistoryEvent[];
  onImageSelect: (selected: SelectedImage) => void;
}) {
  const groups = useMemo(() => {
    const out: { date: string; title: string; href?: string | null; images: TreatmentImage[] }[] = [];
    events.forEach((e) => {
      if (e.type === "treatment" && e.images?.length) {
        out.push({ date: e.date, title: e.title, href: e.href, images: e.images });
      }
    });
    return out;
  }, [events]);

  if (!groups.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
        No treatment photos in this date range. Upload before/after images on a treatment session.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={`${g.date}-${g.title}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {g.title} · {formatDate(g.date)}
            </p>
            {g.href && (
              <Link href={g.href} className="text-xs text-violet-600 hover:underline">
                View session
              </Link>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {g.images.map((img) => (
              <ClickableTreatmentImage
                key={img.uuid}
                image={img}
                sessionHref={g.href}
                onSelect={onImageSelect}
                width={96}
                height={96}
                className="h-24 w-24"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryEventCard({
  event,
  patientUuid,
  patientName,
  onPreviewDocument,
  onDownloadDocument,
  onDeleteDocument,
  onEditPayment,
  onImageSelect,
  canManagePayments,
  compact,
}: {
  event: PatientHistoryEvent;
  patientUuid: string;
  patientName: string;
  onPreviewDocument: (doc: Document) => void;
  onDownloadDocument: (doc: Document) => void;
  onDeleteDocument: (doc: Document) => void;
  onEditPayment: (payment: Payment) => void;
  onImageSelect: (selected: SelectedImage) => void;
  canManagePayments: boolean;
  compact?: boolean;
}) {
  const Icon = TYPE_ICON[event.type];
  const doctorName = metaText(event.meta, "doctor_name");
  const paymentMethod = metaText(event.meta, "payment_method");
  const paymentReference = metaText(event.meta, "reference");
  const routinePeriod = metaText(event.meta, "routine_period");
  const appointmentTime = metaText(event.meta, "appointment_time");
  const document = event.type === "document" ? eventToDocument(event, patientUuid, patientName) : null;
  const payment = event.type === "payment" ? eventToPayment(event, patientUuid) : null;
  const statusLabel = displayStatus(event.status);
  const amount = eventAmount(event);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900/50",
        compact ? "p-3 pl-9" : "rounded-2xl p-4 pl-10"
      )}
    >
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40",
          compact ? "left-2 top-3 h-6 w-6" : "left-3 top-5 h-8 w-8"
        )}
      >
        <Icon className={cn("text-violet-600", compact ? "h-3 w-3" : "h-4 w-4")} />
      </span>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{TYPE_LABEL[event.type]}</Badge>
            {statusLabel && <Badge variant="default">{statusLabel}</Badge>}
            {!compact && <span className="text-xs text-slate-500">{formatDate(event.date)}</span>}
          </div>
          <p className={cn("font-semibold", compact ? "text-sm" : "mt-1")}>{event.title}</p>
          {event.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{event.description}</p>
          )}
          {event.type === "treatment" && doctorName && (
            <p className="text-xs text-slate-500">Doctor: {doctorName}</p>
          )}
          {event.type === "payment" && paymentMethod && (
            <p className="text-xs text-slate-500 capitalize">Method: {paymentMethod.replace(/_/g, " ")}</p>
          )}
          {event.type === "payment" && paymentReference && (
            <p className="text-xs text-slate-500">Reference: {paymentReference}</p>
          )}
          {event.type === "product_assigned" && routinePeriod && (
            <p className="text-xs text-slate-500 capitalize">Routine: {routinePeriod}</p>
          )}
          {event.type === "product_sale" && metaText(event.meta, "treatment_name") && (
            <p className="text-xs text-slate-500">
              Treatment: {metaText(event.meta, "treatment_name")}
            </p>
          )}
          {event.type === "appointment" && appointmentTime && (
            <p className="text-xs text-slate-500">Time: {appointmentTime}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {amount != null && (
            <span className="font-semibold text-violet-600">{formatCurrency(amount)}</span>
          )}
          {event.href && (
            <Link href={event.href} className="text-xs text-violet-600 hover:underline">
              {event.type === "payment" ? "View session" : "Open"}
            </Link>
          )}
          {payment && canManagePayments && payment.id > 0 && (
            <div className="flex flex-wrap justify-end gap-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => onEditPayment(payment)}>
                Manage
              </Button>
              <ExportPrintMenu
                items={
                  payment.invoice_uuid
                    ? invoiceExportItems(payment.invoice_uuid)
                    : paymentInvoiceItems(patientUuid, payment.uuid)
                }
                label="Receipt"
                size="sm"
                variant="secondary"
              />
            </div>
          )}
          {payment && (!canManagePayments || payment.id <= 0) && (
            <ExportPrintMenu
              items={
                payment.invoice_uuid
                  ? invoiceExportItems(payment.invoice_uuid)
                  : paymentInvoiceItems(patientUuid, payment.uuid)
              }
              label="Receipt"
              size="sm"
              variant="secondary"
            />
          )}
          {document && (
            <div className="flex flex-wrap justify-end gap-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => onPreviewDocument(document)}>
                Manage
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                title="Download"
                onClick={() => onDownloadDocument(document)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Delete document"
                onClick={() => onDeleteDocument(document)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {event.items && event.items.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
          {event.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              {item.total != null && (
                <span className="text-slate-500">{formatCurrency(item.total)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {event.images && event.images.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {event.images.map((img) => (
            <ClickableTreatmentImage
              key={img.uuid}
              image={img}
              sessionHref={event.href}
              onSelect={onImageSelect}
              width={72}
              height={72}
              className="h-14 w-14 sm:h-16 sm:w-16"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDateTree({
  groups,
  uuid,
  patientName,
  onPreviewDocument,
  onDownloadDocument,
  onDeleteDocument,
  onEditPayment,
  onImageSelect,
  canManagePayments,
}: {
  groups: DateGroup[];
  uuid: string;
  patientName: string;
  onPreviewDocument: (doc: Document) => void;
  onDownloadDocument: (doc: Document) => void;
  onDeleteDocument: (doc: Document) => void;
  onEditPayment: (payment: Payment) => void;
  onImageSelect: (selected: SelectedImage) => void;
  canManagePayments: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(groups.slice(0, 5).map((g) => g.date)));

  const toggle = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (!groups.length) {
    return <p className="py-8 text-center text-sm text-slate-500">No events in this date range or filter.</p>;
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const isOpen = expanded.has(group.date);
        return (
          <div
            key={group.date}
            className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"
          >
            <button
              type="button"
              onClick={() => toggle(group.date)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-violet-600" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-violet-600" />
              )}
              <Calendar className="h-4 w-4 shrink-0 text-violet-600" />
              <span>{formatDate(group.date)}</span>
              <Badge variant="muted" className="ml-auto">
                {group.events.length} {group.events.length === 1 ? "item" : "items"}
              </Badge>
            </button>
            {isOpen && (
              <div className="space-y-2 border-t border-slate-200/60 px-3 py-3 dark:border-slate-700">
                {group.events.map((event) => (
                  <div key={event.id} className="relative pl-4 before:absolute before:left-1 before:top-0 before:h-full before:w-px before:bg-violet-200 dark:before:bg-violet-800">
                    <HistoryEventCard
                      event={event}
                      patientUuid={uuid}
                      patientName={patientName}
                      onPreviewDocument={onPreviewDocument}
                      onDownloadDocument={onDownloadDocument}
                      onDeleteDocument={onDeleteDocument}
                      onEditPayment={onEditPayment}
                      onImageSelect={onImageSelect}
                      canManagePayments={canManagePayments}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HistoryFilters({
  typeFilter,
  onTypeFilter,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  datePreset,
  onDatePreset,
}: {
  typeFilter: string;
  onTypeFilter: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  datePreset: string;
  onDatePreset: (key: string) => void;
}) {
  const labelClass = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div>
        <p className={labelClass}>Filter by date</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                onDatePreset(p.key);
                const { from, to } = presetDateRange(p.key);
                onDateFrom(from);
                onDateTo(to);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                datePreset === p.key
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                onDateFrom(e.target.value);
                onDatePreset("custom");
              }}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                onDateTo(e.target.value);
                onDatePreset("custom");
              }}
            />
          </div>
        </div>
      </div>
      <div>
        <p className={labelClass}>Filter by type</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onTypeFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === f.key
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryBody({
  uuid,
  patientName,
  data,
  isLoading,
}: {
  uuid: string;
  patientName: string;
  data?: PatientHistoryPayload;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const { canInteract: canManagePayments } = useModuleAccess("payments");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const refreshHistory = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-history", "v5", uuid] });
    queryClient.invalidateQueries({ queryKey: ["patient", uuid] });
    queryClient.invalidateQueries({ queryKey: ["patient-balance", uuid] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["accounting-balances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const savePayment = async (values: Record<string, unknown> & { treatment_session_uuid?: string }) => {
    if (!editingPayment) return;
    setSavingPayment(true);
    try {
      await api.put(`/payments/${editingPayment.id}`, {
        ...values,
        treatment_session_uuid: values.treatment_session_uuid || null,
      });
      toast.success("Payment updated");
      setEditingPayment(null);
      refreshHistory();
    } catch {
      toast.error("Could not update payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      await downloadDocument(doc, patientName);
      toast.success("Download started");
    } catch {
      toast.error("Could not download file");
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!(await confirmDelete(`Delete "${doc.title}"?`))) return;
    if (await deleteResource(`/documents/${doc.id}`)) {
      toast.success("Document deleted");
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      refreshHistory();
    }
  };

  const allEvents = Array.isArray(data?.events) ? data.events : [];

  const filteredEvents = useMemo(() => {
    let list = filterByDateRange(allEvents, dateFrom, dateTo);
    list = filterByType(list, typeFilter);
    return list;
  }, [allEvents, dateFrom, dateTo, typeFilter]);

  const dateGroups = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return <p className="text-slate-500">Could not load history.</p>;

  const summary = { ...EMPTY_HISTORY_SUMMARY, ...data.summary };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: "Treatments", value: summary.treatments, icon: Stethoscope },
          { label: "Photos", value: summary.images, icon: ImageIcon },
          { label: "Payments", value: summary.payments, icon: DollarSign },
          { label: "Documents", value: summary.documents, icon: FileText },
          { label: "Appointments", value: summary.appointments, icon: Calendar },
          { label: "Products", value: summary.products_assigned, icon: Package },
          { label: "Products sold", value: summary.product_sales, icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-2 p-3">
              <Icon className="h-4 w-4 shrink-0 text-violet-600" />
              <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-[10px] text-slate-500 sm:text-xs">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="h-4 w-4 text-violet-600" />
          Visual tracking
        </h3>
        <VisualGallery events={filteredEvents} onImageSelect={setSelectedImage} />
      </div>

      <HistoryFilters
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
        datePreset={datePreset}
        onDatePreset={(key) => setDatePreset(key)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
          {(dateFrom || dateTo) && " in selected range"}
        </p>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
              viewMode === "tree" ? "bg-violet-600 text-white" : "text-slate-600"
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Tree
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
              viewMode === "list" ? "bg-violet-600 text-white" : "text-slate-600"
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {viewMode === "tree" ? (
        <HistoryDateTree
          groups={dateGroups}
          uuid={uuid}
          patientName={patientName}
          onPreviewDocument={setPreviewDoc}
          onDownloadDocument={(doc) => void handleDownloadDocument(doc)}
          onDeleteDocument={(doc) => void handleDeleteDocument(doc)}
          onEditPayment={setEditingPayment}
          onImageSelect={setSelectedImage}
          canManagePayments={canManagePayments}
        />
      ) : (
        <div className="relative space-y-3 pl-2 before:absolute before:left-0 before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-violet-200 dark:before:bg-violet-800">
          {filteredEvents.map((event) => (
            <HistoryEventCard
              key={event.id}
              event={event}
              patientUuid={uuid}
              patientName={patientName}
              onPreviewDocument={setPreviewDoc}
              onDownloadDocument={(doc) => void handleDownloadDocument(doc)}
              onDeleteDocument={(doc) => void handleDeleteDocument(doc)}
              onEditPayment={setEditingPayment}
              onImageSelect={setSelectedImage}
              canManagePayments={canManagePayments}
            />
          ))}
          {!filteredEvents.length && (
            <p className="py-8 text-center text-sm text-slate-500">No events in this date range or filter.</p>
          )}
        </div>
      )}

      {previewDoc && (
        <Modal
          open
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          description="Preview, download, or manage this document"
          className="max-w-3xl"
        >
          <DocumentViewerPanel
            doc={previewDoc}
            patientName={patientName}
            onClose={() => setPreviewDoc(null)}
          />
        </Modal>
      )}

      {selectedImage && (
        <TreatmentImageHistoryModal
          selected={selectedImage}
          onClose={() => setSelectedImage(null)}
          onChanged={refreshHistory}
        />
      )}

      {editingPayment && (
        <Modal
          open
          onClose={() => setEditingPayment(null)}
          title="Edit payment"
          description={`Update payment for ${patientName}`}
          className="max-w-lg"
        >
          <PaymentForm
            patientUuid={uuid}
            initial={editingPayment}
            loading={savingPayment}
            onSubmit={savePayment}
          />
        </Modal>
      )}
    </div>
  );
}

export function PatientHistoryPanel({
  uuid,
  patientName,
  enabled = true,
}: {
  uuid: string;
  patientName: string;
  enabled?: boolean;
}) {
  const { data, isLoading } = usePatientHistory(uuid, enabled);
  return (
    <div className="scroll-mt-20">
      <HistoryBody uuid={uuid} patientName={patientName} data={data} isLoading={isLoading} />
    </div>
  );
}

export function PatientHistoryModal({
  open,
  onClose,
  uuid,
  patientName,
}: {
  open: boolean;
  onClose: () => void;
  uuid: string;
  patientName: string;
}) {
  const { data, isLoading } = usePatientHistory(uuid, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Patient history"
      description={`Full record for ${patientName} — treatments, products, payments, documents, appointments, and visual tracking. Filter by date or type.`}
      className="max-w-4xl"
    >
      <HistoryBody uuid={uuid} patientName={patientName} data={data} isLoading={isLoading} />
    </Modal>
  );
}

export function PatientHistoryButton({
  uuid,
  patientName,
  variant = "secondary",
  size = "sm",
  className,
  iconOnly = false,
}: {
  uuid: string;
  patientName: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "default";
  className?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title="View history"
      >
        <History className="h-4 w-4" />
        {!iconOnly && <span>View history</span>}
      </Button>
      <PatientHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        uuid={uuid}
        patientName={patientName}
      />
    </>
  );
}
