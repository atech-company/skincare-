"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Patient } from "@/types";

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(5),
  gender: z.enum(["male", "female", "other"]),
  dob: z.string().optional(),
  address: z.string().optional(),
  skin_type: z.enum(["normal", "dry", "oily", "combination", "sensitive"]).optional(),
  allergies: z.string().optional(),
  medical_history: z.string().optional(),
  notes: z.string().optional(),
});

export type PatientFormData = z.infer<typeof schema>;

export function PatientForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<Patient>;
  onSubmit: (data: PatientFormData) => Promise<void>;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: defaultValues?.full_name ?? "",
      phone: defaultValues?.phone ?? "",
      gender: (defaultValues?.gender as PatientFormData["gender"]) ?? "other",
      dob: defaultValues?.dob ?? "",
      address: defaultValues?.address ?? "",
      skin_type: defaultValues?.skin_type as PatientFormData["skin_type"],
      allergies: defaultValues?.allergies ?? "",
      medical_history: defaultValues?.medical_history ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Full Name</label>
        <Input {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">Phone</label>
        <Input {...register("phone")} />
      </div>
      <div>
        <label className="text-sm font-medium">Gender</label>
        <select {...register("gender")} className="flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Date of Birth</label>
        <Input type="date" {...register("dob")} />
      </div>
      <div>
        <label className="text-sm font-medium">Skin Type</label>
        <select {...register("skin_type")} className="flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">—</option>
          {["normal", "dry", "oily", "combination", "sensitive"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Address</label>
        <Input {...register("address")} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Allergies</label>
        <Input {...register("allergies")} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Medical History</label>
        <textarea {...register("medical_history")} className="min-h-[80px] w-full rounded-xl border border-slate-200 p-3 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Notes</label>
        <textarea {...register("notes")} className="min-h-[60px] w-full rounded-xl border border-slate-200 p-3 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : defaultValues?.full_name ? "Save changes" : "Create patient"}
        </Button>
      </div>
    </form>
  );
}
