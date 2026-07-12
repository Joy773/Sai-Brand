import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/mongodb";
import { SITE_URL } from "@/app/lib/site";
import User from "@/app/models/User";

type Payload = {
  email?: string;
  password?: string;
};

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID ||
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

export async function POST(request: NextRequest) {
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

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
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

    // Fresh link on every login attempt for unverified users
    const verificationToken = uuidv4();
    user.verificationToken = verificationToken;
    await user.save();

    const verificationLink = `${SITE_URL}/verify-email/${verificationToken}`;

    const emailjsPayload: Record<string, unknown> = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        user_email: email,
        verification_link: verificationLink,
      },
    };

    if (PRIVATE_KEY) {
      emailjsPayload.accessToken = PRIVATE_KEY;
    }

    const emailjsResponse = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailjsPayload),
      },
    );

    if (!emailjsResponse.ok) {
      const errorText = await emailjsResponse.text();
      // eslint-disable-next-line no-console
      console.error("[send-verification] EmailJS error:", errorText);

      return NextResponse.json(
        {
          ok: false,
          error: errorText || "Failed to send verification email.",
          verificationLink,
          email,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      verificationLink,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[send-verification]", error);

    return NextResponse.json(
      { ok: false, error: "Failed to send verification email." },
      { status: 500 },
    );
  }
}
