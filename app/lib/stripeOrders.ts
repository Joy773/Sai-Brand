import type Stripe from "stripe";
import { connectDB } from "@/app/lib/mongodb";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import Order from "@/app/models/Orders";

export type CheckoutProduct = {
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

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000,
  );
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

    const slug = productObject?.metadata?.slug?.trim() || "";
    const name = item.description?.trim() || productObject?.name?.trim() || "";

    // Shipping is a synthetic line item with slug "shipping".
    if (slug === "shipping" || name.toLowerCase() === "shipping") {
      continue;
    }

    if (!name && !slug) {
      continue;
    }

    const quantity = item.quantity ?? 1;
    const unitAmount =
      typeof item.price?.unit_amount === "number"
        ? item.price.unit_amount / 100
        : typeof item.amount_total === "number"
          ? item.amount_total / 100 / quantity
          : 0;

    const image = productObject?.images?.[0]?.trim() || "/hero-img.png";

    products.push({
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      name: name || slug,
      price: formatEuro(unitAmount),
      image,
      quantity,
    });
  }

  return products;
}

/**
 * Creates (or marks paid) the DB order for a completed Stripe Checkout session.
 * Safe to call from both the webhook and the browser return URL.
 */
export async function createOrderFromCheckoutSession(
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
    return {
      order: existingBySession.toObject(),
      created: false as const,
    };
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
  // Prefer the amount Stripe actually charged over metadata.
  const total =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : parseMoney(metadata.total, price + shippingFee);
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

    try {
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
    } catch (addressError) {
      // eslint-disable-next-line no-console
      console.error(
        "[stripe order] Order saved but address save failed",
        addressError,
      );
    }

    return {
      order,
      created: true as const,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicate = await Order.findOne({ stripeSessionId });
      if (duplicate) {
        if (duplicate.paymentStatus !== "paid") {
          duplicate.paymentStatus = "paid";
          await duplicate.save();
        }
        return {
          order: duplicate.toObject(),
          created: false as const,
        };
      }
    }

    throw error;
  }
}
