import bcrypt from "bcryptjs";
import mongoose from "mongoose";
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
  hasAddressContent,
  saveUserAddress,
  toUserAddress,
  type UserAddressInput,
} from "@/app/lib/saveUserAddress";
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
    [address.firstName, address.lastName].filter(Boolean).join(" "),
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

function toAddressFields(address?: UserAddress | null) {
  return {
    firstName: address?.firstName ?? "",
    lastName: address?.lastName ?? "",
    streetAddress: address?.streetAddress ?? "",
    country: address?.country ?? "",
    stateProvince: address?.stateProvince ?? "",
    city: address?.city ?? "",
    zipPostalCode: address?.zipPostalCode ?? "",
    phoneNumber: address?.phoneNumber ?? "",
  };
}

type LeanUserRecord = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  address?: UserAddress | null;
  createdAt: Date;
};

async function resolveAddressesForUsers(users: LeanUserRecord[]) {
  const usersMissingAddress = users.filter(
    (user) => !hasAddressContent(user.address),
  );

  const latestOrderByEmail = new Map<string, UserAddress>();

  if (usersMissingAddress.length > 0) {
    const emails = usersMissingAddress.map((user) => user.email);
    const latestOrders = await Order.aggregate<{
      _id: string;
      firstName?: string;
      lastName?: string;
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
          firstName: { $first: "$firstName" },
          lastName: { $first: "$lastName" },
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
        firstName: order.firstName ?? "",
        lastName: order.lastName ?? "",
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

  return users.map((user) => {
    const address =
      (hasAddressContent(user.address) ? user.address : null) ??
      latestOrderByEmail.get(user.email) ??
      null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      address: formatAddress(address),
      addressFields: toAddressFields(address),
      createdAt: user.createdAt,
    };
  });
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const isAdmin = session.user.role === "admin";

  try {
    await connectDB();

    const users = (
      isAdmin
        ? await User.find()
            .select("name email address createdAt")
            .sort({ createdAt: -1 })
            .lean()
        : await User.find({ email: session.user.email.trim().toLowerCase() })
            .select("name email address createdAt")
            .lean()
    ) as LeanUserRecord[];

    return NextResponse.json({
      ok: true,
      users: await resolveAddressesForUsers(users),
    });
  } catch (error) {
    console.error("[users api] Failed to fetch users", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load users. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const isAdmin =
    session.user.role === "admin" || session.user.id === "admin";

  let body: Partial<UserAddressInput> & {
    id?: string;
    name?: string;
    email?: string;
  };

  try {
    body = (await request.json()) as Partial<UserAddressInput> & {
      id?: string;
      name?: string;
      email?: string;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const userId = body.id?.trim() ?? "";

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      { ok: false, error: "Valid user id is required." },
      { status: 400 },
    );
  }

  const addressInput: UserAddressInput = {
    firstName: body.firstName?.trim() ?? "",
    lastName: body.lastName?.trim() ?? "",
    streetAddress: body.streetAddress?.trim() ?? "",
    country: body.country?.trim() ?? "",
    stateProvince: body.stateProvince?.trim() ?? "",
    city: body.city?.trim() ?? "",
    zipPostalCode: body.zipPostalCode?.trim() ?? "",
    phoneNumber: body.phoneNumber?.trim() ?? "",
  };

  if (
    !addressInput.streetAddress ||
    !addressInput.country ||
    !addressInput.city ||
    !addressInput.zipPostalCode ||
    !addressInput.phoneNumber
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Street address, country, city, zip/postal code, and phone number are required.",
      },
      { status: 400 },
    );
  }

  const rawName = typeof body.name === "string" ? body.name : null;
  const rawEmail = typeof body.email === "string" ? body.email : null;
  const hasNameUpdate = rawName !== null;
  const hasEmailUpdate = rawEmail !== null;
  const nextName = hasNameUpdate ? rawName.trim() : "";
  const nextEmail = hasEmailUpdate ? rawEmail.trim().toLowerCase() : "";

  if (hasNameUpdate && !nextName) {
    return NextResponse.json(
      { ok: false, error: "Name is required." },
      { status: 400 },
    );
  }

  if (hasEmailUpdate && (!nextEmail || !emailPattern.test(nextEmail))) {
    return NextResponse.json(
      { ok: false, error: "A valid email is required." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await User.findById(userId).select("name email").lean();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    const sessionEmail = session.user.email.trim().toLowerCase();
    const isOwnProfile =
      user.email.trim().toLowerCase() === sessionEmail ||
      session.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    if (hasEmailUpdate && nextEmail !== user.email.trim().toLowerCase()) {
      const emailTaken = await User.exists({
        email: nextEmail,
        _id: { $ne: user._id },
      });

      if (emailTaken) {
        return NextResponse.json(
          { ok: false, error: "That email is already in use." },
          { status: 409 },
        );
      }
    }

    const address = toUserAddress(addressInput);
    const emailChanged =
      hasEmailUpdate && nextEmail !== user.email.trim().toLowerCase();
    const verificationOtp = emailChanged ? generateEmailOtp() : null;
    const verificationOtpHash = verificationOtp
      ? await hashEmailOtp(verificationOtp)
      : null;

    const updateFields: {
      address: UserAddress;
      name?: string;
      email?: string;
      emailVerified?: boolean;
      verificationOtpHash?: string;
      verificationOtpExpires?: Date;
    } = { address };

    if (hasNameUpdate) {
      updateFields.name = nextName;
    }

    if (hasEmailUpdate) {
      updateFields.email = nextEmail;
    }

    if (emailChanged && verificationOtpHash) {
      updateFields.emailVerified = false;
      updateFields.verificationOtpHash = verificationOtpHash;
      updateFields.verificationOtpExpires = emailOtpExpiresAt();
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: updateFields,
        ...(emailChanged
          ? { $unset: { autoLoginToken: 1, verificationToken: 1 } }
          : {}),
      },
      { returnDocument: "after" },
    ).select("name email address");

    if (!updatedUser) {
      return NextResponse.json(
        { ok: false, error: "Failed to update user." },
        { status: 500 },
      );
    }

    let verificationEmailSent = false;

    if (emailChanged && verificationOtp) {
      const recipientName = updatedUser.name;

      if (isEmailConfigured()) {
        try {
          await sendVerificationEmail({
            to: updatedUser.email,
            name: recipientName,
            otp: verificationOtp,
          });
          verificationEmailSent = true;
        } catch (error) {
          console.error(
            "[users api] Failed to send email-change verification",
            error,
          );
        }
      } else {
        console.error(
          "[users api] SMTP is not configured; skipped email-change verification",
        );
      }
    }

    return NextResponse.json({
      ok: true,
      id: userId,
      name: updatedUser.name,
      email: updatedUser.email,
      address: formatAddress(updatedUser.address),
      addressFields: toAddressFields(updatedUser.address),
      emailChanged,
      verificationEmailSent,
      ...(!verificationEmailSent && emailChanged
        ? {
            error:
              "Profile updated, but we could not send the verification email.",
          }
        : {}),
    });
  } catch (error) {
    console.error("[users api] Failed to update user", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update user. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let userId = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!userId) {
    try {
      const body = (await request.json()) as { id?: string };
      userId = body.id?.trim() ?? "";
    } catch {
      userId = "";
    }
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "User id is required." },
      { status: 400 },
    );
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid user id." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: deletedUser._id.toString(),
    });
  } catch (error) {
    console.error("[users api] Failed to delete user", error);

    return NextResponse.json(
      { ok: false, error: "Failed to delete user. Please try again." },
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
    const verificationOtp = generateEmailOtp();
    const verificationOtpHash = await hashEmailOtp(verificationOtp);

    // Address is intentionally not set at signup. It is saved when the user places an order.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      emailVerified: false,
      verificationOtpHash,
      verificationOtpExpires: emailOtpExpiresAt(),
    });

    let emailSent = false;

    if (isEmailConfigured()) {
      try {
        await sendVerificationEmail({
          to: email,
          name,
          otp: verificationOtp,
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
