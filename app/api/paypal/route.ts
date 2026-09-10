import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { fromCents, resolveOrderPricing } from "@/app/lib/orderPricing";
import { getPayPalClient, paypal } from "@/app/lib/paypal";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import Order from "@/app/models/Orders";

type PayPalProductPayload = {
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  quantity?: number;
};

type PayPalOrderPayload = {
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  zipPostalCode?: string;
  phoneNumber?: string;
  address?: string;
  shippingFee?: number;
  products?: PayPalProductPayload[];
};

type PayPalOrderResult = {
  id?: string;
  status?: string;
  links?: Array<{ href?: string; rel?: string; method?: string }>;
};

const CURRENCY = "EUR";

function centsToPayPalAmount(cents: number) {
  return (cents / 100).toFixed(2);
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

function formatDeliveryAddress(input: {
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
}) {
  return [
    `${input.firstName} ${input.lastName}`.trim(),
    input.streetAddress,
    [input.city, input.stateProvince, input.zipPostalCode]
      .filter(Boolean)
      .join(", "),
    input.country,
    input.phoneNumber,
  ]
    .filter(Boolean)
    .join("\n");
}

function getPayPalErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Failed to create PayPal order. Please try again.";
  }

  const maybeResult = "result" in error ? error.result : null;
  if (maybeResult && typeof maybeResult === "object") {
    const details = "details" in maybeResult ? maybeResult.details : null;
    if (Array.isArray(details) && details[0]) {
      const first = details[0] as { description?: string; issue?: string };
      if (first.description) {
        return first.description;
      }
      if (first.issue) {
        return first.issue;
      }
    }

    if (
      "message" in maybeResult &&
      typeof maybeResult.message === "string" &&
      maybeResult.message.trim()
    ) {
      return maybeResult.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Failed to create PayPal order. Please try again.";
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Please sign in again." },
      { status: 401 },
    );
  }

  let body: PayPalOrderPayload;

  try {
    body = (await request.json()) as PayPalOrderPayload;
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

  const email = session.user.email?.trim().toLowerCase() ?? "";
  const customerName =
    session.user.name?.trim() || `${firstName} ${lastName}`.trim() || email;

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "User profile is incomplete." },
      { status: 400 },
    );
  }

  const deliveryAddress =
    address ||
    formatDeliveryAddress({
      firstName,
      lastName,
      streetAddress,
      country,
      stateProvince,
      city,
      zipPostalCode,
      phoneNumber,
    });

  // Prices and shipping are resolved from the database, never trusted from the
  // client, to prevent amount tampering.
  const pricing = await resolveOrderPricing({ products, country });

  if (!pricing.ok) {
    return NextResponse.json(
      { ok: false, error: pricing.error },
      { status: pricing.status },
    );
  }

  const items = pricing.products.map((product) => {
    return {
      name: product.name.slice(0, 127),
      sku: product.slug.slice(0, 127),
      unit_amount: {
        currency_code: CURRENCY,
        value: centsToPayPalAmount(product.unitPriceCents),
      },
      quantity: String(product.quantity),
      category: "PHYSICAL_GOODS" as const,
    };
  });

  const productsTotalCents = pricing.productsTotalCents;
  const shippingCents = pricing.shippingFeeCents;
  const orderTotalCents = pricing.totalCents;
  const origin = getOrigin(request);

  const amountBreakdown: Record<string, { currency_code: string; value: string }> =
    {
      item_total: {
        currency_code: CURRENCY,
        value: centsToPayPalAmount(productsTotalCents),
      },
    };

  if (shippingCents > 0) {
    amountBreakdown.shipping = {
      currency_code: CURRENCY,
      value: centsToPayPalAmount(shippingCents),
    };
  }

  try {
    // Create the PayPal order first so the popup is not blocked by DB latency.
    const client = getPayPalClient();
    const createRequest = new paypal.orders.OrdersCreateRequest();
    createRequest.prefer("return=representation");
    createRequest.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "sai-cart",
          description: "German Care order",
          // Prefer email so the webhook can recover the customer if the
          // browser never finishes capture-order.
          custom_id: email.slice(0, 127),
          amount: {
            currency_code: CURRENCY,
            value: centsToPayPalAmount(orderTotalCents),
            breakdown: amountBreakdown,
          },
          items,
        },
      ],
      application_context: {
        brand_name: "German Care",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${origin}/cart?paypal=success`,
        cancel_url: `${origin}/cart?paypal=cancel`,
      },
    });

    const response = await client.execute<PayPalOrderResult>(createRequest);
    const orderId = response.result.id?.trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Failed to create PayPal order." },
        { status: 500 },
      );
    }

    // Persist a pending order as soon as PayPal accepts the checkout. If the
    // browser dies after payment, the webhook can mark this paid (or rebuild
    // from PayPal if this write somehow failed).
    try {
      await connectDB();

      const existing = await Order.findOne({ paypalOrderId: orderId });
      if (!existing) {
        const orderTime = new Date();
        try {
          await Order.create({
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
            address: deliveryAddress,
            paymentMethod: "paypal",
            paymentStatus: "pending",
            price: fromCents(productsTotalCents),
            shippingFee: fromCents(shippingCents),
            products: pricing.products.map((product) => ({
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.image,
              quantity: product.quantity,
            })),
            total: fromCents(orderTotalCents),
            orderPlaceTime: orderTime,
            orderTime,
            status: "pending",
            paypalOrderId: orderId,
          });
        } catch (createError) {
          // Duplicate is fine (retry / race). Anything else must not block PayPal.
          const isDuplicate =
            createError &&
            typeof createError === "object" &&
            "code" in createError &&
            createError.code === 11000;

          if (!isDuplicate) {
            throw createError;
          }
        }
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
    } catch (persistError) {
      // eslint-disable-next-line no-console
      console.error(
        "[paypal api] PayPal order created but pending order/address save failed",
        { orderId, persistError },
      );
    }

    const approveUrl = response.result.links?.find(
      (link) => link.rel === "approve",
    )?.href;

    return NextResponse.json({
      ok: true,
      orderId,
      status: response.result.status ?? null,
      approveUrl: approveUrl ?? null,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[paypal api] Failed to create PayPal order", error);

    return NextResponse.json(
      { ok: false, error: getPayPalErrorMessage(error) },
      { status: 500 },
    );
  }
}
