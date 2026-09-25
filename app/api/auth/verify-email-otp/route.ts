import { NextRequest, NextResponse } from "next/server";
import { isEmailOtpMatch } from "@/app/lib/emailOtp";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import User from "@/app/models/User";

type Payload = {
  email?: string;
  otp?: string;
};

export async function POST(request: NextRequest) {
  const limit = rateLimit(`verify-email-otp:${getClientIp(request)}`, {
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

  const email = body.email?.trim().toLowerCase();
  const otp = body.otp?.trim() ?? "";

  if (!email || !/^\d{4}$/.test(otp)) {
    return NextResponse.json(
      { ok: false, error: "Enter the 4-digit code from your email." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await User.findOne({ email }).select(
      "+verificationOtpHash",
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired code." },
        { status: 400 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const matches = await isEmailOtpMatch(
      otp,
      user.verificationOtpHash,
      user.verificationOtpExpires,
    );

    if (!matches) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired code." },
        { status: 400 },
      );
    }

    user.emailVerified = true;
    user.verificationOtpHash = undefined;
    user.verificationOtpExpires = undefined;
    user.verificationToken = undefined;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[verify-email-otp]", error);

    return NextResponse.json(
      { ok: false, error: "Failed to verify the code. Please try again." },
      { status: 500 },
    );
  }
}
