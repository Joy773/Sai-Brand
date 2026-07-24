import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import {
  isEmailConfigured,
  sendContactEmail,
} from "@/app/lib/sendEmail";

type ContactPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  inquiryType?: string;
  message?: string;
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: NextRequest) {
  const limit = rateLimit(`contact:${getClientIp(request)}`, {
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

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Email service is not configured." },
      { status: 500 },
    );
  }

  let body: ContactPayload;

  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = body.phone?.trim() ?? "";
  const inquiryType = body.inquiryType?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!firstName || !email || !message || !inquiryType) {
    return NextResponse.json(
      {
        ok: false,
        error: "First name, email, inquiry type, and message are required.",
      },
      { status: 400 },
    );
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email address." },
      { status: 400 },
    );
  }

  try {
    await sendContactEmail({
      firstName,
      lastName,
      email,
      phone,
      inquiryType,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact api] Failed to send contact email", error);

    return NextResponse.json(
      { ok: false, error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }
}
