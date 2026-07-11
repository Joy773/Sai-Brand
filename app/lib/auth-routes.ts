const protectedRoutePrefixes = [] as const;

const adminRoutePrefix = "/admin/";

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isAdminRoute(pathname: string) {
  return pathname.startsWith(adminRoutePrefix);
}
