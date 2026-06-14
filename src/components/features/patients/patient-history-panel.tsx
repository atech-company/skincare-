"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  GitBranch,
  History,
  ImageIcon,
  List,
  Package,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { EMPTY_HISTORY_SUMMARY, normalizePatientHistory } from "@/lib/api-data";
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
import type { Document } from "@/types";

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
  return typeof v === "string" && v.length > 0 ? v : null;
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
    queryKey: ["patient-history", "v4", uuid],
    queryFn: async () => {
      const res = await api.get<{ data: unknown }>(`/patients/${uuid}/timeline`);
      return normalizePatientHistory(res.data.data);
    },
    enabled: enabled && !!uuid,
    staleTime: 60_000,
  });
}

function VisualGallery({ events }: { events: PatientHistoryEvent[] }) {
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
              <div key={img.uuid} className="relative shrink-0">
                <Image
                  src={mediaUrl(img.thumbnail_url || img.file_url) ?? ""}
                  alt={img.type}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <Badge variant="muted" className="absolute bottom-1 left-1 capitalize">
                  {img.type}
                </Badge>
              </div>
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
  compact,
}: {
  event: PatientHistoryEvent;
  patientUuid: string;
  patientName: string;
  onPreviewDocument: (doc: Document) => void;
  compact?: boolean;
}) {
  const Icon = TYPE_ICON[event.type];
  const doctorName = metaText(event.meta, "doctor_name");
  const paymentMethod = metaText(event.meta, "payment_method");
  const routinePeriod = metaText(event.meta, "routine_period");
  const appointmentTime = metaText(event.meta, "appointment_time");
  const fileUrl = mediaUrl(metaText(event.meta, "file_url"));
  const documentUuid = metaText(event.meta, "document_uuid");

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
            {event.status && <Badge variant="default">{event.status}</Badge>}
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
            <p className="text-xs text-slate-500">Method: {paymentMethod}</p>
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
          {event.amount != null && (
            <span className="font-semibold text-violet-600">{formatCurrency(event.amount)}</span>
          )}
          {event.href && (
            <Link href={event.href} className="text-xs text-violet-600 hover:underline">
              Open
            </Link>
          )}
          {event.type === "document" && fileUrl && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onPreviewDocument({
                  id: 0,
                  uuid: documentUuid ?? event.id,
                  title: event.title,
                  category: event.description ?? "document",
                  file_url: fileUrl ?? "",
                  mime_type: metaText(event.meta, "mime_type") ?? "application/octet-stream",
                  file_size: 0,
                  patient_uuid: patientUuid,
                  patient_name: patientName,
                })
              }
            >
              Preview
            </Button>
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
            <Image
              key={img.uuid}
              src={mediaUrl(img.thumbnail_url || img.file_url) ?? ""}
              alt={img.type}
              width={72}
              height={72}
              className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
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
}: {
  groups: DateGroup[];
  uuid: string;
  patientName: string;
  onPreviewDocument: (doc: Document) => void;
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

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
        <VisualGallery events={filteredEvents} />
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
            />
          ))}
          {!filteredEvents.length && (
            <p className="py-8 text-center text-sm text-slate-500">No events in this date range or filter.</p>
          )}
        </div>
      )}

      {previewDoc && (
        <DocumentViewerPanel
          doc={previewDoc}
          patientName={patientName}
          onClose={() => setPreviewDoc(null)}
        />
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
