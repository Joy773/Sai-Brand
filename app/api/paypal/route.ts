import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { getPayPalClient, paypal } from "@/app/lib/paypal";
import { parsePrice } from "@/app/lib/price";
import { saveUserAddress } from "@/app/lib/saveUserAddress";

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

function isValidProduct(product: PayPalProductPayload) {
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

function toPayPalAmount(value: number) {
  return value.toFixed(2);
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

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
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
  const shippingFee =
    typeof body.shippingFee === "number" &&
    Number.isFinite(body.shippingFee) &&
    body.shippingFee >= 0
      ? body.shippingFee
      : 0;

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

  const items = [];
  let productsTotal = 0;

  for (const product of products) {
    const unitPrice = parsePrice(product.price!);

    if (unitPrice <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid price for product "${product.name}".`,
        },
        { status: 400 },
      );
    }

    productsTotal += unitPrice * product.quantity!;

    items.push({
      name: product.name!.trim().slice(0, 127),
      sku: product.slug!.trim().slice(0, 127),
      unit_amount: {
        currency_code: CURRENCY,
        value: toPayPalAmount(unitPrice),
      },
      quantity: String(product.quantity!),
      category: "PHYSICAL_GOODS" as const,
    });
  }

  const orderTotal = productsTotal + shippingFee;
  const origin = getOrigin(request);

  const amountBreakdown: Record<string, { currency_code: string; value: string }> =
    {
      item_total: {
        currency_code: CURRENCY,
        value: toPayPalAmount(productsTotal),
      },
    };

  if (shippingFee > 0) {
    amountBreakdown.shipping = {
      currency_code: CURRENCY,
      value: toPayPalAmount(shippingFee),
    };
  }

  try {
    await connectDB();

    const client = getPayPalClient();
    const createRequest = new paypal.orders.OrdersCreateRequest();
    createRequest.prefer("return=representation");
    createRequest.requestBody({
      intent: "CAPTURE",
      payer: {
        name: {
          given_name: firstName,
          surname: lastName,
        },
        email_address: email,
      },
      purchase_units: [
        {
          reference_id: "sai-cart",
          description: "German Care order",
          custom_id: (session.user.id ?? email).slice(0, 127),
          amount: {
            currency_code: CURRENCY,
            value: toPayPalAmount(orderTotal),
            breakdown: amountBreakdown,
          },
          items,
        },
      ],
      application_context: {
        brand_name: "German Care",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${origin}/checkout?checkout=success&provider=paypal`,
        cancel_url: `${origin}/checkout?checkout=cancel&provider=paypal`,
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

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create PayPal order. Please try again.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
