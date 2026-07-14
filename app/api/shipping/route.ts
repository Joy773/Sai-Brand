import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import ShippingRate from "@/app/models/ShippingRate";

type CreatePayload = {
  country?: string;
  price?: number;
};

type UpdatePayload = {
  id?: string;
  country?: string;
  price?: number;
  enabled?: boolean;
};

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    await connectDB();

    const session = await auth();
    const isAdmin = session?.user?.role === "admin";
    const rates = await ShippingRate.find(isAdmin ? {} : { enabled: true })
      .sort({ country: 1 })
      .lean();

    return NextResponse.json({
      ok: true,
      rates: rates.map((rate) => ({
        id: rate._id.toString(),
        country: rate.country,
        price: rate.price,
        enabled: rate.enabled,
      })),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[shipping api] Failed to fetch rates", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load shipping rates." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: CreatePayload;
  try {
    body = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const country = body.country?.trim();
  const price = body.price;

  if (!country) {
    return NextResponse.json(
      { ok: false, error: "Country is required." },
      { status: 400 },
    );
  }

  if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid shipping price." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const rate = await ShippingRate.create({
      country,
      price,
      enabled: true,
    });

    return NextResponse.json(
      {
        ok: true,
        rate: {
          id: rate._id.toString(),
          country: rate.country,
          price: rate.price,
          enabled: rate.enabled,
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
        { ok: false, error: "This country already exists." },
        { status: 409 },
      );
    }

    // eslint-disable-next-line no-console
    console.error("[shipping api] Failed to create rate", error);
    return NextResponse.json(
      { ok: false, error: "Failed to add country." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: UpdatePayload;
  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Shipping rate id is required." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};

  if (body.country !== undefined) {
    const country = body.country.trim();
    if (!country) {
      return NextResponse.json(
        { ok: false, error: "Country is required." },
        { status: 400 },
      );
    }
    updates.country = country;
  }

  if (body.price !== undefined) {
    if (
      typeof body.price !== "number" ||
      Number.isNaN(body.price) ||
      body.price < 0
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid shipping price." },
        { status: 400 },
      );
    }
    updates.price = body.price;
  }

  if (body.enabled !== undefined) {
    updates.enabled = body.enabled;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No updates provided." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const rate = await ShippingRate.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!rate) {
      return NextResponse.json(
        { ok: false, error: "Shipping rate not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      rate: {
        id: rate._id.toString(),
        country: rate.country,
        price: rate.price,
        enabled: rate.enabled,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { ok: false, error: "This country already exists." },
        { status: 409 },
      );
    }

    // eslint-disable-next-line no-console
    console.error("[shipping api] Failed to update rate", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update shipping rate." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Shipping rate id is required." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const rate = await ShippingRate.findByIdAndDelete(id);

    if (!rate) {
      return NextResponse.json(
        { ok: false, error: "Shipping rate not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[shipping api] Failed to delete rate", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete country." },
      { status: 500 },
    );
  }
}
