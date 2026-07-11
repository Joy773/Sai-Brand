import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { parsePrice } from "@/app/lib/price";
import getStripe from "@/app/lib/stripe";

type CheckoutProductPayload = {
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  quantity?: number;
};

type CheckoutPayload = {
  address?: string;
  products?: CheckoutProductPayload[];
};

function isValidProduct(product: CheckoutProductPayload) {
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
    product.quantity >= 1 &&
    Number.isFinite(product.quantity)
  );
}

function getOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const host = request.headers.get("host");
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

function toStripeUnitAmount(price: string) {
  return Math.round(parsePrice(price) * 100);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: CheckoutPayload;

  try {
    body = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const address = body.address?.trim() ?? "";
  const products = body.products;

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

  const name = session.user.name?.trim() ?? "";
  const email = session.user.email?.trim().toLowerCase() ?? "";

  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: "User profile is incomplete." },
      { status: 400 },
    );
  }

  const lineItems = [];

  for (const product of products) {
    const unitAmount = toStripeUnitAmount(product.price!);

    if (unitAmount < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid price for product "${product.name}".`,
        },
        { status: 400 },
      );
    }

    const image = product.image!.trim();
    const images = image.startsWith("https://") ? [image] : undefined;

    lineItems.push({
      quantity: product.quantity!,
      price_data: {
        currency: "eur" as const,
        unit_amount: unitAmount,
        product_data: {
          name: product.name!.trim(),
          images,
          metadata: {
            slug: product.slug!.trim(),
          },
        },
      },
    });
  }

  try {
    const stripe = getStripe();
    const origin = getOrigin(request);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      success_url: `${origin}/checkout?checkout=success`,
      cancel_url: `${origin}/checkout?checkout=cancel`,
      metadata: {
        userId: session.user.id ?? "",
        userName: name,
        userEmail: email,
        address,
        products: JSON.stringify(
          products.map((product) => ({
            slug: product.slug!.trim(),
            name: product.name!.trim(),
            price: product.price!.trim(),
            image: product.image!.trim(),
            quantity: product.quantity!,
          })),
        ),
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { ok: false, error: "Failed to create checkout session." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[checkout api] Failed to create Stripe session", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to start checkout. Please try again.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
