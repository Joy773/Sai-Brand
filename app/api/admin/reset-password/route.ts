import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { consumeAdminResetToken } from "@/app/lib/adminOtp";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import AdminCredential from "@/app/models/AdminCredential";

type Payload = {
  resetToken?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(request: NextRequest) {
  const limit = rateLimit(`admin-reset-password:${getClientIp(request)}`, {
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

  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const resetToken = body.resetToken?.trim() ?? "";
  const password = body.password ?? "";
  const confirmPassword = body.confirmPassword ?? "";

  if (!resetToken) {
    return NextResponse.json(
      { ok: false, error: "Reset session expired. Request a new code." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "Passwords do not match." },
      { status: 400 },
    );
  }

  if (!consumeAdminResetToken(resetToken)) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired reset session. Request a new code." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const passwordHash = await bcrypt.hash(password, 12);

    await AdminCredential.findOneAndUpdate(
      { key: "admin" },
      { $set: { passwordHash } },
      { upsert: true, returnDocument: "after" },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[admin reset-password] Failed to update password", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update password. Please try again." },
      { status: 500 },
    );
  }
}
