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
  address?: string;
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

    const orders = await Order.find()
      .sort({ orderPlaceTime: -1 })
      .lean();

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
          address: order.address,
          itemsSummary: formatItemsSummary(order.products),
          products: order.products,
          total: order.total,
          date: formatOrderDate(order.orderPlaceTime),
          orderPlaceTime: order.orderPlaceTime,
          orderTime: order.orderTime,
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

  const address = body.address?.trim();
  const products = body.products;
  const total = body.total;

  if (!address) {
    return NextResponse.json(
      { ok: false, error: "Delivery address is required." },
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

  if (typeof total !== "number" || Number.isNaN(total) || total < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid order total." },
      { status: 400 },
    );
  }

  const name = session.user.name?.trim();
  const email = session.user.email?.trim().toLowerCase();

  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: "User profile is incomplete." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const orderTime = new Date();

    const order = await Order.create({
      name,
      email,
      address,
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
    });

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: order._id.toString(),
          name: order.name,
          email: order.email,
          address: order.address,
          products: order.products,
          total: order.total,
          orderPlaceTime: order.orderPlaceTime,
          orderTime: order.orderTime,
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
