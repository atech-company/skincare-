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

export function isAdminUser(roles: unknown): boolean {
  return normalizeRoles(roles).includes("admin");
}
