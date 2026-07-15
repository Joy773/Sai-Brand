import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
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
  paymentMethod?: "cod" | "online";
  paymentStatus?: "pending" | "paid";
  price?: number;
  shippingFee?: number;
  products?: OrderProductPayload[];
  total?: number;
};

function isValidProduct(product: OrderProductPayload) {
  return (
    typeof product.slug === "string" &&
    product.slug.trim().length > 0 &&
    typeof product.name === "string" &&
    product.name.trim().length > 0 &&
    typeof product.price === "string" &&
    product.price.trim().length > 0 &&
    typeof product.image === "string" &&
    product.image.trim().length > 0 &&
    typeof product.quantity === "number" &&
    product.quantity >= 1
  );
}

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
  const price = body.price;
  const shippingFee = body.shippingFee ?? 0;
  const total = body.total;
  const paymentStatus =
    body.paymentStatus === "paid"
      ? "paid"
      : paymentMethod === "cod"
        ? "pending"
        : "pending";

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

  if (paymentMethod !== "cod" && paymentMethod !== "online") {
    return NextResponse.json(
      { ok: false, error: "Invalid payment method." },
      { status: 400 },
    );
  }

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      { ok: false, error: "At least one product is required." },
      { status: 400 },
    );
  }

  if (!products.every(isValidProduct)) {
    return NextResponse.json(
      { ok: false, error: "Invalid product data." },
      { status: 400 },
    );
  }

  if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid order price." },
      { status: 400 },
    );
  }

  if (
    typeof shippingFee !== "number" ||
    Number.isNaN(shippingFee) ||
    shippingFee < 0
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid shipping fee." },
      { status: 400 },
    );
  }

  if (typeof total !== "number" || Number.isNaN(total) || total < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid order total." },
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
      products: products.map((product) => ({
        slug: product.slug!.trim(),
        name: product.name!.trim(),
        price: product.price!.trim(),
        image: product.image!.trim(),
        quantity: product.quantity!,
      })),
      total,
      orderPlaceTime: orderTime,
      orderTime,
      status: "pending",
    });

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
