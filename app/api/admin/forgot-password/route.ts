import { NextRequest, NextResponse } from "next/server";
import { generateAdminOtp, storeAdminOtp } from "@/app/lib/adminOtp";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import { isEmailConfigured, sendAdminOtpEmail } from "@/app/lib/sendEmail";

const ADMIN_OTP_RECIPIENT =
  process.env.CONTACT_TO_EMAIL?.trim() ||
  process.env.ADMIN_EMAIL?.trim() ||
  "info@german-care.com";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`admin-forgot-password:${getClientIp(request)}`, {
    limit: 3,
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

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Email service is not configured." },
      { status: 500 },
    );
  }

  try {
    const otp = generateAdminOtp();
    storeAdminOtp(otp);

    await sendAdminOtpEmail({
      to: ADMIN_OTP_RECIPIENT,
      otp,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[admin forgot-password] Failed to send OTP", error);

    const message =
      error instanceof Error &&
      /timeout|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|connection/i.test(error.message)
        ? "Could not reach the email server. Check SMTP settings or outbound SMTP access on the host."
        : "Failed to send OTP email. Please try again.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
