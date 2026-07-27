import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getUserFirstName } from "@/app/lib/getUserFirstName";
import { connectDB } from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (session.user.role === "admin" || session.user.id === "admin") {
    return NextResponse.json({
      ok: true,
      firstName: getUserFirstName({ name: session.user.name ?? "Admin" }),
    });
  }

  try {
    await connectDB();

    const email = session.user.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select("name address").lean();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      firstName: getUserFirstName(user),
    });
  } catch (error) {
    console.error("[user profile api] Failed to load profile", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load profile." },
      { status: 500 },
    );
  }
}
