import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import {
  emailOtpExpiresAt,
  generateEmailOtp,
  hashEmailOtp,
} from "@/app/lib/emailOtp";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import {
  isEmailConfigured,
  sendVerificationEmail,
} from "@/app/lib/sendEmail";
import User from "@/app/models/User";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`resend-email-otp:${getClientIp(request)}`, {
    limit: 5,
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

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Please sign in again." },
      { status: 401 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Email service is not configured." },
      { status: 500 },
    );
  }

  try {
    await connectDB();

    const user = await User.findById(session.user.id).select(
      "+verificationOtpHash",
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { ok: false, error: "Email is already verified." },
        { status: 400 },
      );
    }

    const otp = generateEmailOtp();
    user.verificationOtpHash = await hashEmailOtp(otp);
    user.verificationOtpExpires = emailOtpExpiresAt();
    user.verificationToken = undefined;
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[resend-email-otp]", error);

    return NextResponse.json(
      { ok: false, error: "Failed to send verification email." },
      { status: 500 },
    );
  }
}
