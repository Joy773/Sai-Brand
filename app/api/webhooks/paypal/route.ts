import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import {
  getPayPalAccessToken,
  getPayPalApiBaseUrl,
  getPayPalClient,
  paypal,
} from "@/app/lib/paypal";
import Order from "@/app/models/Orders";
import User from "@/app/models/User";

export const runtime = "nodejs";

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    purchase_units?: Array<{
      custom_id?: string;
      amount?: {
        currency_code?: string;
        value?: string;
        breakdown?: {
          item_total?: { value?: string };
          shipping?: { value?: string };
        };
      };
      items?: Array<{
        name?: string;
        sku?: string;
        quantity?: string;
        unit_amount?: { value?: string };
      }>;
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { currency_code?: string; value?: string };
        }>;
      };
    }>;
    payer?: {
      email_address?: string;
      name?: {
        given_name?: string;
        surname?: string;
      };
    };
  };
};

type PayPalOrderDetails = {
  id?: string;
  status?: string;
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  purchase_units?: Array<{
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
      breakdown?: {
        item_total?: { value?: string };
        shipping?: { value?: string };
      };
    };
    items?: Array<{
      name?: string;
      sku?: string;
      quantity?: string;
      unit_amount?: { value?: string };
    }>;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
};

type VerifyWebhookResponse = {
  verification_status?: string;
};

function getHeader(request: NextRequest, name: string) {
  return (
    request.headers.get(name) ??
    request.headers.get(name.toLowerCase()) ??
    ""
  ).trim();
}

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

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000,
  );
}

async function verifyPayPalWebhook(
  request: NextRequest,
  webhookEvent: PayPalWebhookEvent,
) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const transmissionId = getHeader(request, "paypal-transmission-id");
  const transmissionTime = getHeader(request, "paypal-transmission-time");
  const transmissionSig = getHeader(request, "paypal-transmission-sig");
  const certUrl = getHeader(request, "paypal-cert-url");
  const authAlgo = getHeader(request, "paypal-auth-algo");

  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSig ||
    !certUrl ||
    !authAlgo
  ) {
    throw new Error("Missing PayPal webhook verification headers.");
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(
    `${getPayPalApiBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    },
  );

  const data = (await response.json()) as VerifyWebhookResponse & {
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.message || data.name || "PayPal webhook verification request failed.",
    );
  }

  if (data.verification_status !== "SUCCESS") {
    throw new Error(
      `PayPal webhook verification failed: ${data.verification_status ?? "UNKNOWN"}`,
    );
  }
}

async function fetchPayPalOrder(paypalOrderId: string) {
  const client = getPayPalClient();
  const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
  const response = await client.execute<PayPalOrderDetails>(request);
  return response.result;
}

async function findCustomer(customId: string, payerEmail: string) {
  await connectDB();

  const normalizedEmail = payerEmail.trim().toLowerCase();
  const trimmedCustomId = customId.trim();

  if (trimmedCustomId.includes("@")) {
    const byCustomEmail = await User.findOne({
      email: trimmedCustomId.toLowerCase(),
    }).lean();
    if (byCustomEmail) {
      return byCustomEmail;
    }
  }

  if (trimmedCustomId && mongoose.Types.ObjectId.isValid(trimmedCustomId)) {
    const byId = await User.findById(trimmedCustomId).lean();
    if (byId) {
      return byId;
    }
  }

  if (normalizedEmail) {
    return User.findOne({ email: normalizedEmail }).lean();
  }

  return null;
}

async function markOrderPaid(input: {
  paypalOrderId?: string;
  paypalCaptureId?: string;
}) {
  const paypalOrderId = input.paypalOrderId?.trim() || "";
  const paypalCaptureId = input.paypalCaptureId?.trim() || "";

  if (!paypalOrderId && !paypalCaptureId) {
    return { found: false as const };
  }

  await connectDB();

  const order =
    (paypalCaptureId
      ? await Order.findOne({ paypalCaptureId })
      : null) ??
    (paypalOrderId ? await Order.findOne({ paypalOrderId }) : null);

  if (!order) {
    return { found: false as const };
  }

  let changed = false;

  if (order.paymentStatus !== "paid") {
    order.paymentStatus = "paid";
    changed = true;
  }

  if (paypalCaptureId && order.paypalCaptureId !== paypalCaptureId) {
    order.paypalCaptureId = paypalCaptureId;
    changed = true;
  }

  if (paypalOrderId && order.paypalOrderId !== paypalOrderId) {
    order.paypalOrderId = paypalOrderId;
    changed = true;
  }

  if (changed) {
    await order.save();
  }

  return {
    found: true as const,
    created: false as const,
    dbOrderId: String(order._id),
    updated: changed,
  };
}

/**
 * Rebuilds an order from PayPal when money was captured but no DB row exists
 * (browser crash, pending-order write failed, etc.).
 */
async function recoverOrderFromPayPal(input: {
  paypalOrderId: string;
  paypalCaptureId?: string;
}) {
  const paypalOrderId = input.paypalOrderId.trim();
  const paypalCaptureId = input.paypalCaptureId?.trim() || "";

  if (!paypalOrderId) {
    return { found: false as const, created: false as const };
  }

  const paypalOrder = await fetchPayPalOrder(paypalOrderId);
  const unit = paypalOrder.purchase_units?.[0];
  const capture =
    unit?.payments?.captures?.find(
      (item) => item.status?.toUpperCase() === "COMPLETED",
    ) ??
    unit?.payments?.captures?.find((item) => Boolean(item.id)) ??
    null;

  const resolvedCaptureId = paypalCaptureId || capture?.id?.trim() || "";
  const customId = unit?.custom_id?.trim() || "";
  const payerEmail = paypalOrder.payer?.email_address?.trim().toLowerCase() || "";
  const customer = await findCustomer(customId, payerEmail);

  const savedAddress = customer?.address;
  const payerGiven = paypalOrder.payer?.name?.given_name?.trim() || "";
  const payerSurname = paypalOrder.payer?.name?.surname?.trim() || "";

  const firstName =
    savedAddress?.firstName?.trim() ||
    payerGiven ||
    customer?.name?.trim().split(/\s+/)[0] ||
    "Customer";
  const lastName =
    savedAddress?.lastName?.trim() ||
    payerSurname ||
    customer?.name?.trim().split(/\s+/).slice(1).join(" ") ||
    "Unknown";
  const streetAddress =
    savedAddress?.streetAddress?.trim() || "Address pending recovery";
  const country = savedAddress?.country?.trim() || "Unknown";
  const stateProvince = savedAddress?.stateProvince?.trim() || "";
  const city = savedAddress?.city?.trim() || "Unknown";
  const zipPostalCode = savedAddress?.zipPostalCode?.trim() || "00000";
  const phoneNumber = savedAddress?.phoneNumber?.trim() || "N/A";
  const email =
    (typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : "") ||
    (customId.includes("@") ? customId.toLowerCase() : "") ||
    payerEmail ||
    "unknown@recovery.local";
  const customerName =
    (typeof customer?.name === "string" ? customer.name.trim() : "") ||
    `${firstName} ${lastName}`.trim() ||
    email;

  const address = formatDeliveryAddress({
    firstName,
    lastName,
    streetAddress,
    country,
    stateProvince,
    city,
    zipPostalCode,
    phoneNumber,
  });

  const paypalItems = unit?.items ?? [];
  const products =
    paypalItems.length > 0
      ? paypalItems.map((item) => {
          const quantity = Math.max(
            1,
            Number.parseInt(item.quantity ?? "1", 10) || 1,
          );
          const unitAmount = parseMoney(item.unit_amount?.value, 0);
          const slug =
            item.sku?.trim() ||
            item.name?.trim().toLowerCase().replace(/\s+/g, "-") ||
            "unknown-product";

          return {
            slug: slug.slice(0, 200),
            name: (item.name?.trim() || slug).slice(0, 200),
            price: formatEuro(unitAmount),
            image: "/hero-img.png",
            quantity,
          };
        })
      : [
          {
            slug: "paypal-recovery",
            name: "PayPal recovered order",
            price: formatEuro(parseMoney(unit?.amount?.value, 0)),
            image: "/hero-img.png",
            quantity: 1,
          },
        ];

  const shippingFee = parseMoney(unit?.amount?.breakdown?.shipping?.value, 0);
  const itemTotal = parseMoney(
    unit?.amount?.breakdown?.item_total?.value,
    products.reduce((sum, product) => {
      const amount = Number.parseFloat(product.price.replace(/[^\d.-]/g, ""));
      return sum + (Number.isFinite(amount) ? amount : 0) * product.quantity;
    }, 0),
  );
  const total = parseMoney(
    capture?.amount?.value ?? unit?.amount?.value,
    itemTotal + shippingFee,
  );

  await connectDB();

  // Another request may have created the order while we were fetching PayPal.
  const existing =
    (resolvedCaptureId
      ? await Order.findOne({ paypalCaptureId: resolvedCaptureId })
      : null) ?? (await Order.findOne({ paypalOrderId }));

  if (existing) {
    return markOrderPaid({
      paypalOrderId,
      paypalCaptureId: resolvedCaptureId,
    });
  }

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
      paymentMethod: "paypal",
      paymentStatus: "paid",
      price: itemTotal,
      shippingFee,
      products,
      total,
      orderPlaceTime: orderTime,
      orderTime,
      status: "pending",
      paypalOrderId,
      paypalCaptureId: resolvedCaptureId || undefined,
    });

    // eslint-disable-next-line no-console
    console.warn("[paypal webhook] Recovered missing order from PayPal", {
      paypalOrderId,
      paypalCaptureId: resolvedCaptureId,
      dbOrderId: String(order._id),
    });

    return {
      found: true as const,
      created: true as const,
      dbOrderId: String(order._id),
      updated: true as const,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return markOrderPaid({
        paypalOrderId,
        paypalCaptureId: resolvedCaptureId,
      });
    }

    throw error;
  }
}

async function ensureOrderPaid(input: {
  paypalOrderId?: string;
  paypalCaptureId?: string;
}) {
  const marked = await markOrderPaid(input);

  if (marked.found) {
    return marked;
  }

  const paypalOrderId = input.paypalOrderId?.trim() || "";
  if (!paypalOrderId) {
    return marked;
  }

  return recoverOrderFromPayPal({
    paypalOrderId,
    paypalCaptureId: input.paypalCaptureId,
  });
}

async function handleCaptureCompleted(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const paypalCaptureId = resource?.id?.trim() || "";
  const paypalOrderId =
    resource?.supplementary_data?.related_ids?.order_id?.trim() || "";
  const status = resource?.status?.trim().toUpperCase() || "";

  if (status && status !== "COMPLETED") {
    return {
      handled: true,
      skipped: true,
      reason: `Capture status is ${status}`,
    };
  }

  const result = await ensureOrderPaid({ paypalOrderId, paypalCaptureId });

  if (!result.found) {
    // eslint-disable-next-line no-console
    console.warn(
      "[paypal webhook] Capture completed but order could not be recovered",
      { paypalOrderId, paypalCaptureId, eventId: event.id },
    );
  }

  return {
    handled: true,
    skipped: false,
    ...result,
  };
}

async function handleCheckoutOrderCompleted(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const paypalOrderId = resource?.id?.trim() || "";
  const capture = resource?.purchase_units?.[0]?.payments?.captures?.find(
    (item) => item.status?.toUpperCase() === "COMPLETED" || Boolean(item.id),
  );
  const paypalCaptureId = capture?.id?.trim() || "";

  const result = await ensureOrderPaid({ paypalOrderId, paypalCaptureId });

  if (!result.found) {
    // eslint-disable-next-line no-console
    console.warn(
      "[paypal webhook] Order completed but order could not be recovered",
      { paypalOrderId, paypalCaptureId, eventId: event.id },
    );
  }

  return {
    handled: true,
    skipped: false,
    ...result,
  };
}

export async function POST(request: NextRequest) {
  let event: PayPalWebhookEvent;

  try {
    event = (await request.json()) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  try {
    await verifyPayPalWebhook(request, event);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[paypal webhook] Signature verification failed", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Invalid PayPal webhook signature.",
      },
      { status: 400 },
    );
  }

  try {
    const eventType = event.event_type?.trim() ?? "";

    let result: Record<string, unknown> = {
      handled: false,
      eventType,
    };

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      result = await handleCaptureCompleted(event);
    } else if (eventType === "CHECKOUT.ORDER.COMPLETED") {
      result = await handleCheckoutOrderCompleted(event);
    }

    return NextResponse.json({
      ok: true,
      received: true,
      eventId: event.id ?? null,
      eventType,
      ...result,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[paypal webhook] Failed to process event", error);

    return NextResponse.json(
      { ok: false, error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}
