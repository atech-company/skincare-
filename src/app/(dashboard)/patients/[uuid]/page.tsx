"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, Phone, Plus, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import type { Patient, TreatmentImage } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { PatientEditModal } from "@/components/features/patients/patient-crud-modals";
import {
  DeletePatientButton,
  DocumentsTab,
  PaymentsTab,
  ProductsTab,
  SessionListCrud,
} from "@/components/features/patients/patient-profile-crud";

const BeforeAfterViewer = dynamic(
  () => import("@/components/features/images/before-after-viewer").then((m) => m.BeforeAfterViewer),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-2xl" /> }
);

const TAB_KEYS = ["overview", "timeline", "treatments", "images", "products", "documents", "payments"] as const;

function usePatientInclude(uuid: string, include: string | null) {
  return useQuery({
    queryKey: ["patient", uuid, include],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${uuid}`, {
        params: { include: include ?? "summary" },
      });
      return res.data.data;
    },
    enabled: !!uuid && !!include,
    staleTime: 5 * 60 * 1000,
  });
}

function PatientProfileContent() {
  const { uuid } = useParams<{ uuid: string }>();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(
    TAB_KEYS.includes(initialTab as (typeof TAB_KEYS)[number]) ? (initialTab as string) : "overview"
  );
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TAB_KEYS.includes(t as (typeof TAB_KEYS)[number])) setTab(t);
  }, [searchParams]);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", uuid, "summary"],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${uuid}`, {
        params: { include: "summary" },
      });
      return res.data.data;
    },
    enabled: !!uuid,
  });

  const includeForTab: Record<string, string | null> = {
    overview: null,
    timeline: null,
    treatments: "treatments",
    images: "images",
    products: "products",
    documents: "documents",
    payments: "payments",
  };

  const tabInclude = includeForTab[tab];
  const { data: tabData, isLoading: tabLoading } = usePatientInclude(
    uuid,
    tab !== "overview" && tab !== "timeline" ? tabInclude : null
  );

  const merged: Patient | undefined =
    patient && tabData ? { ...patient, ...tabData } : patient;

  if (isLoading || !patient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const display = merged ?? patient;
  const sessions = display.treatment_sessions ?? [];
  const lastVisit = display.last_visit;
  const allImages = sessions.flatMap((s) => s.images ?? []);
  const beforeImg = allImages.find((i) => i.type === "before");
  const afterImg = allImages.find((i) => i.type === "after");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-violet-50/30 to-indigo-50/20 p-6 shadow-lg dark:border-slate-800 dark:from-slate-900 dark:via-violet-950/20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">
                {display.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{display.full_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{display.phone}</span>
                {display.skin_type && <Badge>{display.skin_type}</Badge>}
                {lastVisit && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Last visit: {formatDate(String(lastVisit))}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Link href={`/treatments/new?patient=${uuid}`}>
              <Button size="sm"><Plus className="h-4 w-4" /> Add treatment</Button>
            </Link>
            <DeletePatientButton patient={display} />
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="images">Before/After</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {tabLoading && tab !== "overview" && tab !== "timeline" && (
          <Skeleton className="mb-4 h-2 w-32" />
        )}

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Medical notes</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Allergies:</strong> {display.allergies || "—"}</p>
              <p><strong>History:</strong> {display.medical_history || "—"}</p>
              <p><strong>Notes:</strong> {display.notes || "—"}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <PatientTimeline uuid={uuid} />
        </TabsContent>

        <TabsContent value="treatments">
          <SessionListCrud uuid={uuid} sessions={sessions} loading={tabLoading} />
        </TabsContent>

        <TabsContent value="images">
          {tab === "images" && (
            <>
              <BeforeAfterViewer before={beforeImg} after={afterImg} />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {allImages.map((img: TreatmentImage) => (
                  <Image
                    key={img.uuid}
                    src={img.thumbnail_url || img.file_url}
                    alt={img.type}
                    width={160}
                    height={160}
                    className="aspect-square rounded-xl object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="products">
          {tab === "products" && <ProductsTab uuid={uuid} products={display.products} />}
        </TabsContent>

        <TabsContent value="documents">
          {tab === "documents" && (
            <DocumentsTab uuid={uuid} patient={display} documents={display.documents} />
          )}
        </TabsContent>

        <TabsContent value="payments">
          {tab === "payments" && <PaymentsTab uuid={uuid} payments={display.payments} />}
        </TabsContent>
      </Tabs>

      <PatientEditModal patient={display} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

export default function PatientProfilePage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <PatientProfileContent />
    </Suspense>
  );
}

function PatientTimeline({ uuid }: { uuid: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["timeline", uuid],
    queryFn: async () => {
      const res = await api.get(`/patients/${uuid}/timeline`);
      return res.data.data as { type: string; date: string }[];
    },
    enabled: !!uuid,
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-violet-200">
      {data?.map((item, i) => (
        <div key={i} className="relative rounded-2xl border p-4">
          <span className="absolute -left-[22px] top-4 h-3 w-3 rounded-full bg-violet-500" />
          <Badge variant="muted">{item.type}</Badge>
          <p className="mt-1 text-sm text-slate-500">{formatDate(item.date)}</p>
        </div>
      ))}
      {!data?.length && <p className="text-slate-500">No timeline events yet.</p>}
    </div>
  );
}
