import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOtp } from "@/app/lib/adminOtp";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";

type Payload = {
  otp?: string;
};

export async function POST(request: NextRequest) {
  const limit = rateLimit(`admin-verify-otp:${getClientIp(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const otp = body.otp?.trim() ?? "";

  if (!/^\d{4}$/.test(otp)) {
    return NextResponse.json(
      { ok: false, error: "Enter the 4-digit code from your email." },
      { status: 400 },
    );
  }

  const resetToken = verifyAdminOtp(otp);

  if (!resetToken) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired code." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    resetToken,
  });
}
