import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import User from "@/app/models/User";

type Payload = {
  token?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const limit = rateLimit(`reset-password:${getClientIp(request)}`, {
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

  const token = body.token?.trim() ?? "";
  const password = body.password;

  if (!token || !password) {
    return NextResponse.json(
      { ok: false, error: "Token and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset link." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Write through the native collection so select:false / strict schema
    // quirks cannot leave the old password in place.
    const updateResult = await User.collection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      },
    );

    if (updateResult.matchedCount !== 1) {
      return NextResponse.json(
        { ok: false, error: "Failed to reset password. Please try again." },
        { status: 500 },
      );
    }

    const updatedUser = await User.findById(user._id).select("+password");
    const passwordSaved =
      !!updatedUser?.password &&
      (await bcrypt.compare(password, updatedUser.password));

    if (!passwordSaved) {
      console.error(
        "[reset-password] Password was not persisted correctly for user",
        user._id.toString(),
      );
      return NextResponse.json(
        { ok: false, error: "Failed to reset password. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password]", error);

    return NextResponse.json(
      { ok: false, error: "Failed to reset password. Please try again." },
      { status: 500 },
    );
  }
}
