import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import {
  hasAddressContent,
  saveUserAddress,
  toUserAddress,
  type UserAddressInput,
} from "@/app/lib/saveUserAddress";
import Order from "@/app/models/Orders";
import User from "@/app/models/User";

async function getLatestOrderAddress(email: string) {
  const latestOrder = await Order.findOne({ email })
    .sort({ orderPlaceTime: -1 })
    .select(
      "firstName lastName streetAddress country stateProvince city zipPostalCode phoneNumber",
    )
    .lean();

  if (!latestOrder) {
    return null;
  }

  const address = toUserAddress({
    firstName: latestOrder.firstName ?? "",
    lastName: latestOrder.lastName ?? "",
    streetAddress: latestOrder.streetAddress ?? "",
    country: latestOrder.country ?? "",
    stateProvince: latestOrder.stateProvince ?? "",
    city: latestOrder.city ?? "",
    zipPostalCode: latestOrder.zipPostalCode ?? "",
    phoneNumber: latestOrder.phoneNumber ?? "",
  });

  return hasAddressContent(address) ? address : null;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (session.user.role === "admin" || session.user.id === "admin") {
    return NextResponse.json({ ok: true, address: null });
  }

  try {
    await connectDB();

    const email = session.user.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select("address").lean();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    let address = hasAddressContent(user.address) ? user.address : null;

    if (!address) {
      address = await getLatestOrderAddress(email);
      if (address) {
        await saveUserAddress(email, address, {
          userId: session.user.id,
          role: session.user.role,
        });
      }
    } else if (!address.firstName?.trim() || !address.lastName?.trim()) {
      const orderAddress = await getLatestOrderAddress(email);
      if (orderAddress) {
        address = {
          ...address,
          firstName: address.firstName?.trim() || orderAddress.firstName || "",
          lastName: address.lastName?.trim() || orderAddress.lastName || "",
        };
        await saveUserAddress(email, address, {
          userId: session.user.id,
          role: session.user.role,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      address: address
        ? {
            firstName: address.firstName ?? "",
            lastName: address.lastName ?? "",
            streetAddress: address.streetAddress ?? "",
            country: address.country ?? "",
            stateProvince: address.stateProvince ?? "",
            city: address.city ?? "",
            zipPostalCode: address.zipPostalCode ?? "",
            phoneNumber: address.phoneNumber ?? "",
          }
        : null,
    });
  } catch (error) {
    console.error("[user address api] Failed to load address", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load address." },
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

  if (session.user.role === "admin" || session.user.id === "admin") {
    return NextResponse.json(
      { ok: false, error: "Admin accounts do not store a delivery address." },
      { status: 400 },
    );
  }

  let body: Partial<UserAddressInput>;

  try {
    body = (await request.json()) as Partial<UserAddressInput>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
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
    !addressInput.firstName ||
    !addressInput.lastName ||
    !addressInput.streetAddress ||
    !addressInput.country ||
    !addressInput.city ||
    !addressInput.zipPostalCode ||
    !addressInput.phoneNumber
  ) {
    return NextResponse.json(
      { ok: false, error: "Complete address is required." },
      { status: 400 },
    );
  }

  try {
    const email = session.user.email.trim().toLowerCase();
    const updatedUser = await saveUserAddress(email, addressInput, {
      userId: session.user.id,
      role: session.user.role,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      address: toUserAddress(addressInput),
    });
  } catch (error) {
    console.error("[user address api] Failed to update address", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update address." },
      { status: 500 },
    );
  }
}
