import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { resolveOrderPricing } from "@/app/lib/orderPricing";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import Order from "@/app/models/Orders";

type OrderProductPayload = {
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  quantity?: number;
};

type CreateOrderPayload = {
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  zipPostalCode?: string;
  phoneNumber?: string;
  address?: string;
  paymentMethod?: "cod" | "online" | "paypal";
  products?: OrderProductPayload[];
};

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

function buildAddress(fields: {
  firstName: string;
  lastName: string;
  streetAddress: string;
  city: string;
  zipPostalCode: string;
  stateProvince: string;
  country: string;
  phoneNumber: string;
}) {
  return [
    `${fields.firstName} ${fields.lastName}`.trim(),
    fields.streetAddress,
    [fields.zipPostalCode, fields.city].filter(Boolean).join(" "),
    fields.stateProvince,
    fields.country,
    fields.phoneNumber ? `Phone: ${fields.phoneNumber}` : "",
  ]
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
          paymentMethod: order.paymentMethod ?? "cod",
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

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const rateLimitKey = `orders:${session.user.id || session.user.email || getClientIp(request)}`;
  const limit = rateLimit(rateLimitKey, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: CreateOrderPayload;

  try {
    body = (await request.json()) as CreateOrderPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const streetAddress = body.streetAddress?.trim() ?? "";
  const country = body.country?.trim() ?? "";
  const stateProvince = body.stateProvince?.trim() ?? "";
  const city = body.city?.trim() ?? "";
  const zipPostalCode = body.zipPostalCode?.trim() ?? "";
  const phoneNumber = body.phoneNumber?.trim() ?? "";
  const paymentMethod = body.paymentMethod;
  const products = body.products;

  // This endpoint only creates Cash-on-Delivery orders. Online (Stripe) and
  // PayPal orders are created by their payment webhook / capture handlers, so a
  // client can never mark those as paid here.
  if (paymentMethod !== "cod") {
    return NextResponse.json(
      { ok: false, error: "Invalid payment method." },
      { status: 400 },
    );
  }

  // Cash on delivery is always unpaid until the courier collects payment.
  const paymentStatus = "pending" as const;

  if (
    !firstName ||
    !lastName ||
    !streetAddress ||
    !country ||
    !city ||
    !zipPostalCode ||
    !phoneNumber
  ) {
    return NextResponse.json(
      { ok: false, error: "Complete delivery address is required." },
      { status: 400 },
    );
  }

  const email = session.user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "User profile is incomplete." },
      { status: 400 },
    );
  }

  // Prices and shipping are resolved from the database, never trusted from the
  // client, to prevent amount tampering.
  const pricing = await resolveOrderPricing({ products, country });
  if (!pricing.ok) {
    return NextResponse.json(
      { ok: false, error: pricing.error },
      { status: pricing.status },
    );
  }

  const price = pricing.productsTotal;
  const shippingFee = pricing.shippingFee;
  const total = pricing.total;

  const customerName =
    `${firstName} ${lastName}`.trim() ||
    session.user.name?.trim() ||
    email;

  const address =
    body.address?.trim() ||
    buildAddress({
      firstName,
      lastName,
      streetAddress,
      city,
      zipPostalCode,
      stateProvince,
      country,
      phoneNumber,
    });

  try {
    await connectDB();

    const orderTime = new Date();

    const order = await Order.create({
      name: customerName,
      email,
      firstName,
      lastName,
      streetAddress,
      country,
      stateProvince,
      city,
      zipPostalCode,
      phoneNumber,
      address,
      paymentMethod,
      paymentStatus,
      price,
      shippingFee,
      products: pricing.products.map((product) => ({
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: product.quantity,
      })),
      total,
      orderPlaceTime: orderTime,
      orderTime,
      status: "pending",
    });

    await saveUserAddress(
      email,
      {
        firstName,
        lastName,
        streetAddress,
        country,
        stateProvince,
        city,
        zipPostalCode,
        phoneNumber,
      },
      {
        userId: session.user.id,
        role: session.user.role,
      },
    );

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: order._id.toString(),
          name: order.name,
          email: order.email,
          firstName: order.firstName,
          lastName: order.lastName,
          streetAddress: order.streetAddress,
          country: order.country,
          stateProvince: order.stateProvince,
          city: order.city,
          zipPostalCode: order.zipPostalCode,
          phoneNumber: order.phoneNumber,
          address: order.address,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          price: order.price,
          shippingFee: order.shippingFee,
          itemNames: order.products.map((product) => product.name),
          products: order.products,
          total: order.total,
          orderPlaceTime: order.orderPlaceTime,
          orderTime: order.orderTime,
          status: order.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[orders api] Failed to create order", error);

    return NextResponse.json(
      { ok: false, error: "Failed to place order. Please try again." },
      { status: 500 },
    );
  }
}
