import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import {
  amountsMatch,
  resolveOrderPricing,
  type ResolvedOrderProduct,
} from "@/app/lib/orderPricing";
import { getPayPalClient, paypal, refundPayPalCapture } from "@/app/lib/paypal";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import Order from "@/app/models/Orders";

type PaypalOrderDoc = NonNullable<Awaited<ReturnType<typeof Order.findOne>>>;

export const runtime = "nodejs";

type CaptureProductPayload = {
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  quantity?: number;
};

type CaptureOrderPayload = {
  orderId?: string;
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
  products?: CaptureProductPayload[];
};

type PayPalCapture = {
  id?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string };
};

type PayPalOrderDetails = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: {
      captures?: PayPalCapture[];
    };
  }>;
};

type OrderFields = {
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
  address: string;
  products: Array<{
    slug: string;
    name: string;
    price: string;
    image: string;
    quantity: number;
  }>;
  price: number;
  shippingFee: number;
  total: number;
  paypalOrderId: string;
};

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

function getPayPalIssue(error: unknown) {
  if (!error || typeof error !== "object" || !("result" in error)) {
    return "";
  }

  const result = error.result;
  if (!result || typeof result !== "object" || !("details" in result)) {
    return "";
  }

  const details = result.details;
  if (!Array.isArray(details) || !details[0] || typeof details[0] !== "object") {
    return "";
  }

  const issue = (details[0] as { issue?: string }).issue;
  return typeof issue === "string" ? issue.trim().toUpperCase() : "";
}

function getCompletedCapture(order: PayPalOrderDetails): PayPalCapture | null {
  const captures = order.purchase_units?.[0]?.payments?.captures ?? [];
  return (
    captures.find((capture) => capture.status?.trim().toUpperCase() === "COMPLETED") ??
    captures[0] ??
    null
  );
}

function parsePayPalAmount(value: string | undefined) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function ownsPaypalOrder(input: {
  customId: string;
  orderEmail?: string;
  sessionEmail: string;
  sessionUserId?: string;
}) {
  const customId = input.customId.trim().toLowerCase();
  const orderEmail = input.orderEmail?.trim().toLowerCase() || "";
  const sessionEmail = input.sessionEmail.trim().toLowerCase();
  const sessionUserId = input.sessionUserId?.trim() || "";

  if (sessionEmail && orderEmail && sessionEmail === orderEmail) {
    return true;
  }

  if (!customId) {
    return false;
  }

  if (sessionEmail && customId === sessionEmail) {
    return true;
  }

  if (sessionUserId && customId === sessionUserId.toLowerCase()) {
    return true;
  }

  return false;
}

function successResponse(input: {
  alreadyCaptured: boolean;
  paypalOrderId: string;
  status: string;
  captureId: string | null;
  dbOrderId: string;
}) {
  return NextResponse.json({
    ok: true,
    alreadyCaptured: input.alreadyCaptured,
    orderId: input.paypalOrderId,
    status: input.status,
    captureId: input.captureId,
    dbOrderId: input.dbOrderId,
  });
}

async function createPendingPaypalOrder(fields: OrderFields) {
  const orderTime = new Date();

  try {
    return await Order.create({
      ...fields,
      paymentMethod: "paypal",
      paymentStatus: "pending",
      orderPlaceTime: orderTime,
      orderTime,
      status: "pending",
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existing = await Order.findOne({ paypalOrderId: fields.paypalOrderId });
    if (existing) {
      return existing;
    }

    throw error;
  }
}

async function markPaypalOrderPaid(
  order: PaypalOrderDoc,
  fields: OrderFields,
  captureId: string | null,
) {
  order.set({
    ...fields,
    paymentMethod: "paypal",
    paymentStatus: "paid",
    ...(captureId ? { paypalCaptureId: captureId } : {}),
  });

  await order.save();
  return order;
}

async function persistPaidPaypalOrder(fields: OrderFields, captureId: string | null) {
  const existing = await Order.findOne({ paypalOrderId: fields.paypalOrderId });

  if (existing) {
    return markPaypalOrderPaid(existing, fields, captureId);
  }

  const orderTime = new Date();

  try {
    return await Order.create({
      ...fields,
      paymentMethod: "paypal",
      paymentStatus: "paid",
      orderPlaceTime: orderTime,
      orderTime,
      status: "pending",
      paypalCaptureId: captureId || undefined,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const duplicate = await Order.findOne({ paypalOrderId: fields.paypalOrderId });
    if (duplicate) {
      return markPaypalOrderPaid(duplicate, fields, captureId);
    }

    throw error;
  }
}

async function refundCapturedPayment(captureId: string | null, paypalOrderId: string) {
  if (!captureId) {
    return;
  }

  try {
    await refundPayPalCapture(captureId);
  } catch (refundError) {
    // eslint-disable-next-line no-console
    console.error("[paypal capture] Failed to refund mismatched capture", {
      paypalOrderId,
      captureId,
      refundError,
    });
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

  let body: CaptureOrderPayload;

  try {
    body = (await request.json()) as CaptureOrderPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const paypalOrderId = body.orderId?.trim() ?? "";
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const streetAddress = body.streetAddress?.trim() ?? "";
  const country = body.country?.trim() ?? "";
  const stateProvince = body.stateProvince?.trim() ?? "";
  const city = body.city?.trim() ?? "";
  const zipPostalCode = body.zipPostalCode?.trim() ?? "";
  const phoneNumber = body.phoneNumber?.trim() ?? "";
  const products = body.products;

  if (!paypalOrderId) {
    return NextResponse.json(
      { ok: false, error: "PayPal order ID is required." },
      { status: 400 },
    );
  }

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

  const email = session.user.email?.trim().toLowerCase() ?? "";
  const customerName =
    session.user.name?.trim() || `${firstName} ${lastName}`.trim() || email;

  if (!email || !customerName) {
    return NextResponse.json(
      { ok: false, error: "User profile is incomplete." },
      { status: 400 },
    );
  }

  const address =
    body.address?.trim() ||
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

  try {
    await connectDB();

    const existingByPayPal = await Order.findOne({ paypalOrderId });
    if (existingByPayPal) {
      const existingEmail = existingByPayPal.email?.trim().toLowerCase() || "";
      if (
        !ownsPaypalOrder({
          customId: "",
          orderEmail: existingEmail,
          sessionEmail: email,
          sessionUserId: session.user.id,
        })
      ) {
        return NextResponse.json(
          { ok: false, error: "This PayPal order does not belong to you." },
          { status: 403 },
        );
      }

      if (existingByPayPal.paymentStatus === "paid") {
        return successResponse({
          alreadyCaptured: true,
          paypalOrderId,
          status: "COMPLETED",
          captureId: existingByPayPal.paypalCaptureId ?? null,
          dbOrderId: String(existingByPayPal._id),
        });
      }
    }

    // Prices and shipping are resolved from the database, never trusted from
    // the client, to prevent amount tampering. Done before capture so a stale
    // cart is rejected without taking money.
    const pricing = await resolveOrderPricing({ products, country });
    if (!pricing.ok) {
      return NextResponse.json(
        { ok: false, error: pricing.error },
        { status: pricing.status },
      );
    }

    const normalizedProducts = pricing.products.map(
      (product: ResolvedOrderProduct) => ({
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: product.quantity,
      }),
    );
    const productsTotal = pricing.productsTotal;
    const shippingFee = pricing.shippingFee;
    const orderTotal = pricing.total;

    const orderFields: OrderFields = {
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
      products: normalizedProducts,
      price: productsTotal,
      shippingFee,
      total: orderTotal,
      paypalOrderId,
    };

    const client = getPayPalClient();
    const getRequest = new paypal.orders.OrdersGetRequest(paypalOrderId);
    const paypalOrderResponse =
      await client.execute<PayPalOrderDetails>(getRequest);
    const paypalOrder = paypalOrderResponse.result;
    const paypalCustomId =
      paypalOrder.purchase_units?.[0]?.custom_id?.trim() || "";

    if (
      !ownsPaypalOrder({
        customId: paypalCustomId,
        orderEmail: existingByPayPal?.email,
        sessionEmail: email,
        sessionUserId: session.user.id,
      })
    ) {
      return NextResponse.json(
        { ok: false, error: "This PayPal order does not belong to you." },
        { status: 403 },
      );
    }

    const paypalStatus = paypalOrder.status?.trim().toUpperCase() ?? "";
    const paypalAmount = parsePayPalAmount(
      paypalOrder.purchase_units?.[0]?.amount?.value,
    );
    const existingCapture = getCompletedCapture(paypalOrder);
    const existingCaptureId = existingCapture?.id?.trim() || null;
    const existingCaptureStatus =
      existingCapture?.status?.trim().toUpperCase() ?? "";

    const persistPaid = async (
      captureId: string | null,
      alreadyCaptured: boolean,
      paidTotal = orderTotal,
    ) => {
      const dbOrder = await persistPaidPaypalOrder(
        { ...orderFields, total: paidTotal },
        captureId,
      );
      return successResponse({
        alreadyCaptured,
        paypalOrderId,
        status: "COMPLETED",
        captureId,
        dbOrderId: String(dbOrder._id),
      });
    };

    // Retry after a previous capture that never wrote/marked the DB order.
    // Record the order even if catalog prices changed — money already moved.
    if (paypalStatus === "COMPLETED" || existingCaptureStatus === "COMPLETED") {
      const paidTotal =
        parsePayPalAmount(existingCapture?.amount?.value) ??
        paypalAmount ??
        orderTotal;
      return persistPaid(existingCaptureId, true, paidTotal);
    }

    if (paypalAmount === null || !amountsMatch(paypalAmount, orderTotal)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The PayPal amount no longer matches the order total. Please try checkout again.",
          orderId: paypalOrderId,
        },
        { status: 400 },
      );
    }

    if (paypalStatus !== "APPROVED") {
      return NextResponse.json(
        {
          ok: false,
          error: "PayPal payment was not completed.",
          status: paypalStatus || null,
          orderId: paypalOrderId,
        },
        { status: 402 },
      );
    }

    // Persist the order before capturing so a DB failure cannot take money
    // without leaving a record. The webhook can mark this paid if capture
    // succeeds and the follow-up write does not.
    const pendingOrder =
      existingByPayPal ?? (await createPendingPaypalOrder(orderFields));

    if (pendingOrder.paymentStatus === "paid") {
      return successResponse({
        alreadyCaptured: true,
        paypalOrderId,
        status: "COMPLETED",
        captureId: pendingOrder.paypalCaptureId ?? null,
        dbOrderId: String(pendingOrder._id),
      });
    }

    let captureStatus = "";
    let capture: PayPalCapture | null = null;
    let captureId: string | null = null;
    let capturePaymentStatus = "";

    try {
      const captureRequest = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      captureRequest.prefer("return=representation");
      captureRequest.requestBody({});

      const response = await client.execute<PayPalOrderDetails>(captureRequest);
      captureStatus = response.result.status?.trim().toUpperCase() ?? "";
      capture = getCompletedCapture(response.result);
      captureId = capture?.id?.trim() ?? null;
      capturePaymentStatus = capture?.status?.trim().toUpperCase() ?? "";
    } catch (error) {
      if (getPayPalIssue(error) === "ORDER_ALREADY_CAPTURED") {
        const retryGet = await client.execute<PayPalOrderDetails>(
          new paypal.orders.OrdersGetRequest(paypalOrderId),
        );
        const retryCapture = getCompletedCapture(retryGet.result);
        return persistPaid(retryCapture?.id?.trim() || null, true);
      }

      throw error;
    }

    if (captureStatus !== "COMPLETED" && capturePaymentStatus !== "COMPLETED") {
      return NextResponse.json(
        {
          ok: false,
          error: "PayPal payment was not completed.",
          status: captureStatus || capturePaymentStatus || null,
          orderId: paypalOrderId,
          captureId,
        },
        { status: 402 },
      );
    }

    const capturedValue = parsePayPalAmount(capture?.amount?.value);
    if (capturedValue !== null && !amountsMatch(capturedValue, orderTotal)) {
      // eslint-disable-next-line no-console
      console.error(
        "[paypal capture] Captured amount does not match server total",
        { paypalOrderId, captureId, capturedValue, orderTotal },
      );

      await refundCapturedPayment(captureId, paypalOrderId);

      if (pendingOrder.paymentStatus === "pending") {
        await Order.deleteOne({
          _id: pendingOrder._id,
          paymentStatus: "pending",
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Captured amount does not match the order total.",
          orderId: paypalOrderId,
          captureId,
        },
        { status: 400 },
      );
    }

    try {
      await markPaypalOrderPaid(pendingOrder, orderFields, captureId);
    } catch (error) {
      // Capture already succeeded. Keep the pending order so the webhook can
      // mark it paid; do not refund a legitimate payment.
      // eslint-disable-next-line no-console
      console.error(
        "[paypal capture] Payment captured but order could not be marked paid",
        { paypalOrderId, captureId, error },
      );

      throw error;
    }

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
          userId: session.user.id,
          role: session.user.role,
        },
      );
    } catch (addressError) {
      // Address save must not fail checkout after money has been captured.
      // eslint-disable-next-line no-console
      console.error(
        "[paypal capture] Order saved but address save failed",
        addressError,
      );
    }

    return successResponse({
      alreadyCaptured: false,
      paypalOrderId,
      status: captureStatus || "COMPLETED",
      captureId,
      dbOrderId: String(pendingOrder._id),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[paypal capture] Failed to capture PayPal order", error);

    return NextResponse.json(
      { ok: false, error: "Failed to capture PayPal payment. Please try again." },
      { status: 500 },
    );
  }
}
