"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Patients", desc: "Open a patient → Overview, treatments, payments", href: "/patients" },
  { title: "Treatments", desc: "Create and edit sessions with before/after photos", href: "/treatments" },
  { title: "Products", desc: "Manage catalog and assign routines on patient profile", href: "/products" },
  { title: "Appointments", desc: "Book, edit status, or cancel visits", href: "/appointments" },
  { title: "Documents", desc: "Upload files for any patient", href: "/documents" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clinic modules</h1>
        <p className="text-slate-500">Each section supports create, edit, and delete</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader><CardTitle className="text-base">{item.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">{item.desc}</p>
              <Link href={item.href}>
                <Button variant="secondary" size="sm">Open {item.title}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">PDF exports (API)</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-500">
          Patient summary, treatment report, and invoices are available from the backend export API.
          Open a patient or treatment page and use export links when you add them to the UI.
        </CardContent>
      </Card>
    </div>
  );
}
