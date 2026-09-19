import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import Order from "@/app/models/Orders";

function formatOrderId(id: string) {
  return `ORD-${id.slice(-6).toUpperCase()}`;
}

function formatItemsSummary(
  products: Array<{ name: string; quantity: number }>,
) {
  return products
    .map((product) => `${product.name} × ${product.quantity}`)
    .join(", ");
}

function formatOrderDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
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

    const orders = await Order.find().sort({ orderPlaceTime: -1 }).lean();

    return NextResponse.json({
      ok: true,
      orders: orders.map((order) => {
        const id = order._id.toString();
        const status =
          order.status === "completed" ? "completed" : "pending";

        return {
          id,
          orderId: formatOrderId(id),
          customerName: order.name,
          email: order.email,
          firstName: order.firstName ?? "",
          lastName: order.lastName ?? "",
          streetAddress: order.streetAddress ?? "",
          country: order.country ?? "",
          stateProvince: order.stateProvince ?? "",
          city: order.city ?? "",
          zipPostalCode: order.zipPostalCode ?? "",
          phoneNumber: order.phoneNumber ?? "",
          address: order.address,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus ?? "pending",
          price: order.price ?? order.total,
          shippingFee: order.shippingFee ?? 0,
          itemsSummary: formatItemsSummary(order.products ?? []),
          itemNames: (order.products ?? []).map((product) => product.name),
          products: order.products ?? [],
          total: order.total,
          date: formatOrderDate(order.orderPlaceTime),
          orderPlaceTime: order.orderPlaceTime,
          orderTime: order.orderTime,
          stripeSessionId: order.stripeSessionId ?? "",
          paypalOrderId: order.paypalOrderId ?? "",
          paypalCaptureId: order.paypalCaptureId ?? "",
          status,
        };
      }),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[orders api] Failed to fetch orders", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load orders. Please try again." },
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

  let orderId = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!orderId) {
    try {
      const body = (await request.json()) as { id?: string };
      orderId = body.id?.trim() ?? "";
    } catch {
      orderId = "";
    }
  }

  if (!orderId) {
    return NextResponse.json(
      { ok: false, error: "Order id is required." },
      { status: 400 },
    );
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid order id." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: deletedOrder._id.toString(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[orders api] Failed to delete order", error);

    return NextResponse.json(
      { ok: false, error: "Failed to delete order. Please try again." },
      { status: 500 },
    );
  }
}
