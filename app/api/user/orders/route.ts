import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import Order from "@/app/models/Orders";

function formatOrderId(id: string) {
  return `ORD-${id.slice(-6).toUpperCase()}`;
}

function formatOrderDate(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatAddress(parts: {
  streetAddress?: string;
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
  country?: string;
}) {
  return [
    parts.streetAddress,
    [parts.zipPostalCode, parts.city].filter(Boolean).join(" "),
    parts.stateProvince,
    parts.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n");
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
    return NextResponse.json({
      ok: true,
      orders: [],
    });
  }

  try {
    await connectDB();

    const email = session.user.email.trim().toLowerCase();
    // Invoices are only available after payment is completed.
    const orders = await Order.find({ email, paymentStatus: "paid" })
      .sort({ orderPlaceTime: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      orders: orders.map((order) => {
        const id = order._id.toString();
        const addressText =
          order.address?.trim() ||
          formatAddress({
            streetAddress: order.streetAddress,
            city: order.city,
            stateProvince: order.stateProvince,
            zipPostalCode: order.zipPostalCode,
            country: order.country,
          });

        return {
          id,
          orderNumber: formatOrderId(id),
          invoiceDate: formatOrderDate(order.orderPlaceTime),
          paymentDate: formatOrderDate(
            order.orderTime ?? order.orderPlaceTime,
          ),
          paymentStatus: "paid" as const,
          paymentMethod: order.paymentMethod,
          fullName:
            `${order.firstName ?? ""} ${order.lastName ?? ""}`.trim() ||
            order.name,
          email: order.email,
          phoneNumber: order.phoneNumber ?? "",
          shippingAddress: addressText,
          billingAddress: addressText,
          products: (order.products ?? []).map((product) => ({
            name: product.name,
            quantity: product.quantity,
            price: product.price,
            image: product.image,
          })),
          price: order.price ?? order.total,
          shippingFee: order.shippingFee ?? 0,
          total: order.total,
        };
      }),
    });
  } catch (error) {
    console.error("[user orders api] Failed to fetch orders", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load orders. Please try again." },
      { status: 500 },
    );
  }
}
