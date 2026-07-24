import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import {
  isEmailConfigured,
  sendVerificationEmail,
} from "@/app/lib/sendEmail";
import { SITE_URL } from "@/app/lib/site";
import User from "@/app/models/User";

type Payload = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const limit = rateLimit(`send-verification:${getClientIp(request)}`, {
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

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
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

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { ok: false, error: "Email is already verified." },
        { status: 400 },
      );
    }

    const verificationToken = uuidv4();
    user.verificationToken = verificationToken;
    await user.save();

    const verificationLink = `${SITE_URL}/verify-email/${verificationToken}`;

    await sendVerificationEmail({
      to: email,
      name: user.name,
      verificationLink,
    });

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[send-verification]", error);

    return NextResponse.json(
      { ok: false, error: "Failed to send verification email." },
      { status: 500 },
    );
  }
}
