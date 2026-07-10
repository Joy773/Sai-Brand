import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import User from "@/app/models/User";

type SignupPayload = {
  name?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      users: users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        address: "",
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[signup api] Failed to fetch users", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load users. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
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

    // eslint-disable-next-line no-console
    console.error("[signup api] Failed to create user", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }
}
