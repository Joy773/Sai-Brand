import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { connectDB } from "@/app/lib/mongodb";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import getStripe from "@/app/lib/stripe";
import Order from "@/app/models/Orders";

export const runtime = "nodejs";

type CheckoutProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
};

function parseMoney(value: string | undefined, fallback = 0) {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatEuro(amount: number) {
  return `€${amount.toFixed(2)}`;
}

async function getProductsFromSession(
  stripe: Stripe,
  sessionId: string,
): Promise<CheckoutProduct[]> {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
    expand: ["data.price.product"],
  });

  const products: CheckoutProduct[] = [];

  for (const item of lineItems.data) {
    const product = item.price?.product;
    const productObject =
      product && typeof product !== "string" && !product.deleted
        ? product
        : null;

    const name = item.description?.trim() || productObject?.name?.trim() || "";

    if (!name || name.toLowerCase() === "shipping") {
      continue;
    }

    const quantity = item.quantity ?? 1;
    const unitAmount =
      typeof item.price?.unit_amount === "number"
        ? item.price.unit_amount / 100
        : typeof item.amount_total === "number"
          ? item.amount_total / 100 / quantity
          : 0;

    const slug =
      productObject?.metadata?.slug?.trim() ||
      name.toLowerCase().replace(/\s+/g, "-");
    const image = productObject?.images?.[0]?.trim() || "/hero-img.png";

    products.push({
      slug,
      name,
      price: formatEuro(unitAmount),
      image,
      quantity,
    });
  }

  return products;
}

async function createOrderFromCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const stripeSessionId = session.id;
  const metadata = session.metadata ?? {};

  await connectDB();

  const existingBySession = await Order.findOne({ stripeSessionId });
  if (existingBySession) {
    if (existingBySession.paymentStatus !== "paid") {
      existingBySession.paymentStatus = "paid";
      await existingBySession.save();
    }
    return existingBySession.toObject();
  }

  const products = await getProductsFromSession(stripe, stripeSessionId);
  const email =
    metadata.userEmail?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    "";
  const firstName = metadata.firstName?.trim() || "";
  const lastName = metadata.lastName?.trim() || "";
  const streetAddress = metadata.streetAddress?.trim() || "";
  const country = metadata.country?.trim() || "";
  const stateProvince = metadata.stateProvince?.trim() || "";
  const city = metadata.city?.trim() || "";
  const zipPostalCode = metadata.zipPostalCode?.trim() || "";
  const phoneNumber = metadata.phoneNumber?.trim() || "";
  const address = metadata.address?.trim() || "";
  const customerName =
    metadata.userName?.trim() ||
    `${firstName} ${lastName}`.trim() ||
    email;

  if (
    !email ||
    !firstName ||
    !lastName ||
    !streetAddress ||
    !country ||
    !city ||
    !zipPostalCode ||
    !phoneNumber ||
    !address ||
    products.length === 0
  ) {
    throw new Error(
      `Checkout session ${stripeSessionId} is missing required order data.`,
    );
  }

  const shippingFee = parseMoney(metadata.shippingFee, 0);
  const productsTotal = products.reduce((sum, product) => {
    const amount = Number.parseFloat(product.price.replace(/[^\d.-]/g, ""));
    return sum + (Number.isFinite(amount) ? amount : 0) * product.quantity;
  }, 0);
  const price = parseMoney(metadata.price, productsTotal);
  const paidTotal =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : price + shippingFee;
  const total = parseMoney(metadata.total, paidTotal);
  const orderTime = new Date();

  try {
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
      paymentMethod: "online",
      paymentStatus: "paid",
      price,
      shippingFee,
      products,
      total,
      orderPlaceTime: orderTime,
      orderTime,
      status: "pending",
      stripeSessionId,
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
        userId: metadata.userId?.trim() || "",
      },
    );

    return order;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      const duplicate = await Order.findOne({ stripeSessionId });
      if (duplicate) {
        duplicate.paymentStatus = "paid";
        await duplicate.save();
        return duplicate.toObject();
      }
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { ok: false, error: "Webhook secret is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] Signature verification failed", error);
    return NextResponse.json(
      { ok: false, error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid" || session.status === "complete") {
        await createOrderFromCheckoutSession(stripe, session);
      }
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] Failed to process event", error);
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}
