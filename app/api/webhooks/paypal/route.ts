import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getPayPalAccessToken, getPayPalApiBaseUrl } from "@/app/lib/paypal";
import Order from "@/app/models/Orders";

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
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
        }>;
      };
    }>;
  };
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

  let order =
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
    dbOrderId: String(order._id),
    updated: changed,
  };
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

  const result = await markOrderPaid({ paypalOrderId, paypalCaptureId });

  if (!result.found) {
    // Client capture normally creates the DB order. If the webhook arrives
    // first (or the browser never finished), we acknowledge safely.
    // eslint-disable-next-line no-console
    console.warn(
      "[paypal webhook] Capture completed but no matching order yet",
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

  const result = await markOrderPaid({ paypalOrderId, paypalCaptureId });

  if (!result.found) {
    // eslint-disable-next-line no-console
    console.warn(
      "[paypal webhook] Order completed but no matching order yet",
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
