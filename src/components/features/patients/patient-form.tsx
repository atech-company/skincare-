"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelClass, optionClass, selectClass, textareaClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
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

const SKIN_TYPES = ["normal", "dry", "oily", "combination", "sensitive"] as const;

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
        <label className={labelClass}>Full Name</label>
        <Input {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <Input {...register("phone")} />
      </div>
      <div>
        <label className={labelClass}>Gender</label>
        <select {...register("gender")} className={selectClass}>
          <option value="female" className={optionClass}>Female</option>
          <option value="male" className={optionClass}>Male</option>
          <option value="other" className={optionClass}>Other</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Date of Birth</label>
        <Input type="date" {...register("dob")} />
      </div>
      <div>
        <label className={labelClass}>Skin Type</label>
        <select {...register("skin_type")} className={selectClass}>
          <option value="" className={optionClass}>—</option>
          {SKIN_TYPES.map((s) => (
            <option key={s} value={s} className={optionClass}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Address</label>
        <Input {...register("address")} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Allergies</label>
        <Input {...register("allergies")} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Medical History</label>
        <textarea {...register("medical_history")} className={cn(textareaClass, "min-h-[80px]")} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Notes</label>
        <textarea {...register("notes")} className={cn(textareaClass, "min-h-[60px]")} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : defaultValues?.full_name ? "Save changes" : "Create patient"}
        </Button>
      </div>
    </form>
  );
}
