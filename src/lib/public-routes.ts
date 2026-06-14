/** Routes that must not trigger /auth/user or redirect to login. */
export const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/maintenance"] as const;

/** Hidden platform console — not linked in sidebar. */
export const PLATFORM_PATH = "/platform";

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isPlatformPath(pathname: string): boolean {
  return pathname === PLATFORM_PATH || pathname.startsWith(`${PLATFORM_PATH}/`);
}
