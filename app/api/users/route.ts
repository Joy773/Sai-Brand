import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import {
  hasAddressContent,
  saveUserAddress,
  toUserAddress,
} from "@/app/lib/saveUserAddress";
import { SITE_URL } from "@/app/lib/site";
import {
  isEmailConfigured,
  sendVerificationEmail,
} from "@/app/lib/sendEmail";
import Order from "@/app/models/Orders";
import User, { type UserAddress } from "@/app/models/User";

type SignupPayload = {
  name?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function formatAddress(address?: UserAddress | null): string {
  if (!address || !hasAddressContent(address)) {
    return "";
  }

  return [
    address.streetAddress,
    [address.zipPostalCode, address.city].filter(Boolean).join(" "),
    address.stateProvince,
    address.country,
    address.phoneNumber ? `Phone: ${address.phoneNumber}` : "",
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n");
}

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    await connectDB();

    const users = await User.find()
      .select("name email address createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const usersMissingAddress = users.filter(
      (user) => !hasAddressContent(user.address),
    );

    const latestOrderByEmail = new Map<string, UserAddress>();

    if (usersMissingAddress.length > 0) {
      const emails = usersMissingAddress.map((user) => user.email);
      const latestOrders = await Order.aggregate<{
        _id: string;
        streetAddress?: string;
        country?: string;
        stateProvince?: string;
        city?: string;
        zipPostalCode?: string;
        phoneNumber?: string;
      }>([
        { $match: { email: { $in: emails } } },
        { $sort: { orderPlaceTime: -1 } },
        {
          $group: {
            _id: "$email",
            streetAddress: { $first: "$streetAddress" },
            country: { $first: "$country" },
            stateProvince: { $first: "$stateProvince" },
            city: { $first: "$city" },
            zipPostalCode: { $first: "$zipPostalCode" },
            phoneNumber: { $first: "$phoneNumber" },
          },
        },
      ]);

      for (const order of latestOrders) {
        const address = toUserAddress({
          streetAddress: order.streetAddress ?? "",
          country: order.country ?? "",
          stateProvince: order.stateProvince ?? "",
          city: order.city ?? "",
          zipPostalCode: order.zipPostalCode ?? "",
          phoneNumber: order.phoneNumber ?? "",
        });

        if (!hasAddressContent(address)) {
          continue;
        }

        latestOrderByEmail.set(order._id, address);
        await saveUserAddress(order._id, address);
      }
    }

    return NextResponse.json({
      ok: true,
      users: users.map((user) => {
        const address =
          (hasAddressContent(user.address) ? user.address : null) ??
          latestOrderByEmail.get(user.email) ??
          null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          address: formatAddress(address),
          createdAt: user.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("[users api] Failed to fetch users", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load users. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`signup:${getClientIp(request)}`, {
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

  let body: SignupPayload;

  try {
    body = (await request.json()) as SignupPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!name || !email || !password) {
    return NextResponse.json(
      { ok: false, error: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email address." },
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    // Address is intentionally not set at signup. It is saved when the user places an order.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      emailVerified: false,
      verificationToken,
    });

    const verificationLink = `${SITE_URL}/verify-email/${verificationToken}`;
    let emailSent = false;

    if (isEmailConfigured()) {
      try {
        await sendVerificationEmail({
          to: email,
          name,
          verificationLink,
        });
        emailSent = true;
      } catch (error) {
        console.error("[users api] Failed to send verification email", error);
      }
    } else {
      console.error("[users api] SMTP is not configured");
    }

    return NextResponse.json(
      {
        ok: true,
        emailSent,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        ...(!emailSent
          ? {
              error:
                "Account created, but we could not send the verification email.",
            }
          : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    console.error("[users api] Failed to create user", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
