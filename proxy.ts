export { auth as proxy } from "@/app/auth";

export const config = {
  matcher: ["/cart", "/cart/:path*", "/admin/:path*"],
};
