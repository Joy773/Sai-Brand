import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { resolveOrderPricing } from "@/app/lib/orderPricing";
import { getPayPalClient, paypal } from "@/app/lib/paypal";
import { saveUserAddress } from "@/app/lib/saveUserAddress";
import Order from "@/app/models/Orders";

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

type PayPalCaptureResult = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
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
      if (existingByPayPal.paymentStatus !== "paid") {
        existingByPayPal.paymentStatus = "paid";
        await existingByPayPal.save();
      }

      return NextResponse.json({
        ok: true,
        alreadyCaptured: true,
        orderId: paypalOrderId,
        status: "COMPLETED",
        captureId: null,
        dbOrderId: String(existingByPayPal._id),
      });
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

    const normalizedProducts = pricing.products.map((product) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: product.quantity,
    }));
    const productsTotal = pricing.productsTotal;
    const shippingFee = pricing.shippingFee;
    const orderTotal = pricing.total;

    const client = getPayPalClient();
    const captureRequest = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    captureRequest.prefer("return=representation");
    captureRequest.requestBody({});

    const response = await client.execute<PayPalCaptureResult>(captureRequest);
    const captureStatus = response.result.status?.trim().toUpperCase() ?? "";
    const capture = response.result.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = capture?.id?.trim() ?? null;
    const capturePaymentStatus = capture?.status?.trim().toUpperCase() ?? "";

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

    // Verify the amount PayPal actually captured matches the server total.
    const capturedValue = Number.parseFloat(capture?.amount?.value ?? "");
    if (
      Number.isFinite(capturedValue) &&
      Math.abs(capturedValue - orderTotal) > 0.01
    ) {
      // eslint-disable-next-line no-console
      console.error(
        "[paypal capture] Captured amount does not match server total",
        { paypalOrderId, captureId, capturedValue, orderTotal },
      );

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

    const orderTime = new Date();

    let dbOrder;
    try {
      dbOrder = await Order.create({
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
        price: productsTotal,
        shippingFee,
        products: normalizedProducts,
        total: orderTotal,
        orderPlaceTime: orderTime,
        orderTime,
        status: "pending",
        paypalOrderId,
        paypalCaptureId: captureId || undefined,
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        const duplicate = await Order.findOne({ paypalOrderId });
        if (duplicate) {
          duplicate.paymentStatus = "paid";
          await duplicate.save();

          return NextResponse.json({
            ok: true,
            alreadyCaptured: true,
            orderId: paypalOrderId,
            status: captureStatus || "COMPLETED",
            captureId,
            dbOrderId: String(duplicate._id),
          });
        }
      }

      throw error;
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
      alreadyCaptured: false,
      orderId: paypalOrderId,
      status: captureStatus || "COMPLETED",
      captureId,
      dbOrderId: String(dbOrder._id),
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
