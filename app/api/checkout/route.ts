import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { resolveOrderPricing } from "@/app/lib/orderPricing";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import getStripe from "@/app/lib/stripe";

type CheckoutProductPayload = {
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  quantity?: number;
};

type CheckoutPayload = {
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  zipPostalCode?: string;
  phoneNumber?: string;
  address?: string;
  price?: number;
  shippingFee?: number;
  total?: number;
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

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

function toStripeUnitAmount(price: number) {
  return Math.round(price * 100);
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

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const streetAddress = body.streetAddress?.trim() ?? "";
  const country = body.country?.trim() ?? "";
  const stateProvince = body.stateProvince?.trim() ?? "";
  const city = body.city?.trim() ?? "";
  const zipPostalCode = body.zipPostalCode?.trim() ?? "";
  const phoneNumber = body.phoneNumber?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const products = body.products;

  if (
    !firstName ||
    !lastName ||
    !streetAddress ||
    !country ||
    !city ||
    !zipPostalCode ||
    !phoneNumber ||
    !address
  ) {
    return NextResponse.json(
      { ok: false, error: "Complete delivery address is required." },
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

  const name = session.user.name?.trim() ?? `${firstName} ${lastName}`.trim();
  const email = session.user.email?.trim().toLowerCase() ?? "";

  if (!name || !email) {
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

  const productsTotal = pricing.productsTotal;
  const resolvedShippingFee = pricing.shippingFee;
  const orderTotal = pricing.total;

  const lineItems = pricing.products.map((product) => {
    const images = product.image.startsWith("https://")
      ? [product.image]
      : undefined;

    return {
      quantity: product.quantity,
      price_data: {
        currency: "eur" as const,
        unit_amount: toStripeUnitAmount(product.unitPrice),
        product_data: {
          name: product.name,
          images,
          metadata: {
            slug: product.slug,
          },
        },
      },
    };
  });

  if (resolvedShippingFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "eur" as const,
        unit_amount: Math.round(resolvedShippingFee * 100),
        product_data: {
          name: "Shipping",
          images: undefined,
          metadata: {
            slug: "shipping",
          },
        },
      },
    });
  }

  try {
    await connectDB();

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
        firstName,
        lastName,
        streetAddress,
        country,
        stateProvince,
        city,
        zipPostalCode,
        phoneNumber,
        address,
        price: productsTotal.toFixed(2),
        shippingFee: resolvedShippingFee.toFixed(2),
        total: orderTotal.toFixed(2),
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { ok: false, error: "Failed to create checkout session." },
        { status: 500 },
      );
    }

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

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[checkout api] Failed to create Stripe session", error);

    return NextResponse.json(
      { ok: false, error: "Failed to start checkout. Please try again." },
      { status: 500 },
    );
  }
}
