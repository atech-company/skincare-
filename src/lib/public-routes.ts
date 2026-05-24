/** Routes that must not trigger /auth/user or redirect to login. */
export const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password"] as const;

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
