import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import {
  isEmailConfigured,
  sendPasswordResetEmail,
} from "@/app/lib/sendEmail";
import { SITE_URL } from "@/app/lib/site";
import User from "@/app/models/User";

type Payload = {
  email?: string;
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const limit = rateLimit(`forgot-password:${getClientIp(request)}`, {
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

  const email = body.email?.trim().toLowerCase() ?? "";

  if (!email || !emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "A valid email address is required." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await User.findOne({ email }).select("+password");

    if (user?.password && isEmailConfigured()) {
      const resetPasswordToken = uuidv4();
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const resetLink = `${SITE_URL}/reset-password/${resetPasswordToken}`;

      try {
        await sendPasswordResetEmail({
          to: email,
          name: user.name,
          resetLink,
        });
      } catch (error) {
        console.error("[forgot-password] Failed to send reset email", error);
      }
    }

    // Always succeed so callers cannot probe which emails exist.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password]", error);

    return NextResponse.json(
      { ok: false, error: "Failed to process request. Please try again." },
      { status: 500 },
    );
  }
}
