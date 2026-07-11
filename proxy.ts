export { auth as proxy } from "@/app/auth";

export const config = {
  matcher: ["/admin/:path*"],
};
