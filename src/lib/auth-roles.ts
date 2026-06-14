/** Normalize roles from API (string[] or legacy { name }[]). */
export function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object" && "name" in r) {
        return String((r as { name: string }).name);
      }
      return "";
    })
    .filter(Boolean);
}

export function isSuperAdminUser(roles: unknown): boolean {
  return normalizeRoles(roles).includes("super_admin");
}

export function isClinicAdminUser(roles: unknown): boolean {
  return normalizeRoles(roles).includes("admin");
}

/** Clinic administrator — not platform super admin. */
export function isAdminUser(roles: unknown): boolean {
  return isClinicAdminUser(roles);
}

export function hasClinicElevatedAccess(roles: unknown): boolean {
  return isClinicAdminUser(roles);
}
